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
    throw new Error(`File upload failed (${response.status})`);
  }

  return response.json();
}

export async function checkFileStatus(
  fileId: string
): Promise<{ status: string }> {
  const { serverUrl, token } = useAuthStore.getState();
  const baseUrl = serverUrl.replace(/\/+$/, "");

  const response = await fetch(
    `${baseUrl}${API_PATHS.FILE_STATUS(fileId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Status check failed (${response.status})`);
  }

  return response.json();
}

export async function pollUntilReady(
  fileId: string,
  intervalMs = 1000,
  maxAttempts = 30
): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { status } = await checkFileStatus(fileId);

    if (status === "completed" || status === "ready") {
      return;
    }

    if (status === "failed" || status === "error") {
      throw new Error("File processing failed");
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("File processing timed out");
}
