import { useAuthStore } from "../stores/authStore";
import { API_PATHS } from "../lib/constants";

/**
 * Poll the Open WebUI file processing status endpoint until the file is ready
 * for RAG injection. If the endpoint is unavailable or returns unexpected values,
 * we resolve after a short delay rather than blocking forever.
 */
export async function waitUntilProcessed(
  fileId: string,
  intervalMs = 1000,
  maxAttempts = 20
): Promise<void> {
  const { serverUrl, token } = useAuthStore.getState();
  const baseUrl = serverUrl.replace(/\/+$/, "");
  const url = `${baseUrl}${API_PATHS.FILE_PROCESS_STATUS(fileId)}`;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        // Endpoint unavailable — assume processing is done and continue.
        console.warn(`[fileUpload] status check failed (${res.status}), proceeding`);
        return;
      }
      const data = await res.json().catch(() => null);
      const status: string = data?.status ?? "";
      if (status === "completed" || status === "ready" || status === "processed") {
        return;
      }
      if (status === "failed" || status === "error") {
        // Server-side processing failed (e.g. text extraction, embedding).
        // The file was uploaded successfully so we still have a valid ID —
        // proceed and let the server handle it gracefully rather than blocking.
        console.warn(`[fileUpload] server processing status "${status}", proceeding with upload`);
        return;
      }
      // status is "uploaded", "pending", "processing", or unknown — keep polling
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith("File processing failed")) {
        throw err;
      }
      // Network or parse error — assume ready and bail out
      console.warn("[fileUpload] status check error, proceeding:", err);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  // Timed out — proceed anyway rather than blocking the user indefinitely
  console.warn("[fileUpload] processing status timed out, proceeding");
}

export async function uploadFile(
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<{ id: string }> {
  const { serverUrl, token } = useAuthStore.getState();
  const baseUrl = serverUrl.replace(/\/+$/, "");

  const formData = new FormData();
  formData.append("file", {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as any);

  const response = await fetch(`${baseUrl}${API_PATHS.FILES_UPLOAD}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let body = "";
    try { body = await response.text(); } catch {}
    console.error(`[fileUpload] upload failed (${response.status}):`, body);
    throw new Error(`File upload failed (${response.status}): ${body}`);
  }

  return response.json();
}
