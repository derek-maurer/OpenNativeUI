import { useCallback } from "react";
import { useChatStore, waitUntilProcessed } from "@opennative/shared";
import { uploadAndProcessFile } from "../services/uploadFile";
import { useToast } from "../components/ui/Toast";

export function useFileUpload() {
  const addPendingFile = useChatStore((s) => s.addPendingFile);
  const updateFileStatus = useChatStore((s) => s.updateFileStatus);
  const removePendingFile = useChatStore((s) => s.removePendingFile);
  const { showToast } = useToast();

  const uploadFile = useCallback(async () => {
    // Open native file dialog via IPC
    const filePath = await window.electronAPI.openFileDialog();
    if (!filePath) return;

    const fileData = await window.electronAPI.readFile(filePath);
    const { name, buffer, mimeType } = fileData;

    const fileId = Math.random().toString(36).slice(2);

    addPendingFile({
      id: fileId,
      name,
      size: 0,
      status: "uploading",
      mimeType,
    });

    // Track the server-assigned ID separately so the catch block always
    // references the correct store entry regardless of which step fails.
    let serverId: string | undefined;

    try {
      const result = await uploadAndProcessFile(buffer, name, mimeType);
      serverId = result.id;

      // For documents (no dataUrl), wait for server-side RAG processing to
      // complete before marking ready, so the model can see the file content.
      if (!result.dataUrl) {
        useChatStore.setState((state) => ({
          pendingFiles: state.pendingFiles.map((f) =>
            f.id === fileId ? { ...f, id: result.id } : f
          ),
        }));
        await waitUntilProcessed(result.id);
      }

      // Update with server ID and preview
      useChatStore.setState((state) => ({
        pendingFiles: state.pendingFiles.map((f) =>
          f.id === fileId || f.id === result.id
            ? {
                ...f,
                id: result.id,   // replace temp id with server id
                status: "ready",
                dataUrl: result.dataUrl,
              }
            : f
        ),
      }));
    } catch (err: any) {
      // Use the server ID if we have it (store entry was already updated to it),
      // otherwise fall back to the local temp ID.
      const errorId = serverId ?? fileId;
      updateFileStatus(errorId, "error");
      showToast(err?.message ?? "Upload failed", "error");
      // Auto-remove after 3s
      setTimeout(() => removePendingFile(errorId), 3000);
    }
  }, [addPendingFile, updateFileStatus, removePendingFile, showToast]);

  return { uploadFile };
}
