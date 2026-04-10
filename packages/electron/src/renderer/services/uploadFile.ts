import { useAuthStore, API_PATHS } from "@opennative/shared";

interface UploadResult {
  id: string;
}

export async function uploadFileFromBlob(
  blob: Blob,
  name: string
): Promise<UploadResult> {
  const { serverUrl, token } = useAuthStore.getState();
  if (!serverUrl || !token) throw new Error("Not authenticated");

  const formData = new FormData();
  formData.append("file", blob, name);

  const res = await fetch(`${serverUrl.replace(/\/+$/, "")}${API_PATHS.FILES_UPLOAD}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error((err as any)?.detail ?? `Upload failed (HTTP ${res.status})`);
  }

  const json = await res.json();
  return { id: json.id };
}

async function resizeImageBlob(blob: Blob, maxEdge = 1568): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });

    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.convertToBlob({ type: "image/jpeg", quality: 0.82 });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function uploadAndProcessFile(
  base64Buffer: string,
  name: string,
  mimeType: string
): Promise<{ id: string; dataUrl?: string }> {
  const raw = Uint8Array.from(atob(base64Buffer), (c) => c.charCodeAt(0));
  let blob = new Blob([raw], { type: mimeType });

  let dataUrl: string | undefined;

  // Resize images before upload
  if (mimeType.startsWith("image/")) {
    blob = await resizeImageBlob(blob);
    // Generate preview dataUrl
    dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }

  const { id } = await uploadFileFromBlob(blob, name);

  return { id, dataUrl };
}
