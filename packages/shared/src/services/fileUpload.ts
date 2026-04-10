import { useAuthStore } from "../stores/authStore";
import { API_PATHS } from "../lib/constants";

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
