import { useCallback } from "react";
import { useChatStore } from "@opennative/shared";
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

    try {
      const result = await uploadAndProcessFile(buffer, name, mimeType);

      // Update with server ID and preview
      useChatStore.setState((state) => ({
        pendingFiles: state.pendingFiles.map((f) =>
          f.id === fileId
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
      updateFileStatus(fileId, "error");
      showToast(err?.message ?? "Upload failed", "error");
      // Auto-remove after 3s
      setTimeout(() => removePendingFile(fileId), 3000);
    }
  }, [addPendingFile, updateFileStatus, removePendingFile, showToast]);

  return { uploadFile };
}
