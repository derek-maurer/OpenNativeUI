import { useCallback } from "react";
import { useChatStore, waitUntilProcessed } from "@opennative/shared";
import { uploadAndProcessFile, uploadAndProcessBlob } from "../services/uploadFile";
import { useToast } from "../components/ui/Toast";

export function useFileUpload() {
  const addPendingFile = useChatStore((s) => s.addPendingFile);
  const updateFileStatus = useChatStore((s) => s.updateFileStatus);
  const removePendingFile = useChatStore((s) => s.removePendingFile);
  const { showToast } = useToast();

  /** Shared logic: track a pending file in the store and upload it. */
  const processUpload = useCallback(
    async (
      name: string,
      mimeType: string,
      upload: () => Promise<{ id: string; dataUrl?: string }>
    ) => {
      const fileId = Math.random().toString(36).slice(2);

      addPendingFile({
        id: fileId,
        name,
        size: 0,
        status: "uploading",
        mimeType,
      });

      let serverId: string | undefined;

      try {
        const result = await upload();
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
                  id: result.id,
                  status: "ready" as const,
                  dataUrl: result.dataUrl,
                }
              : f
          ),
        }));
      } catch (err: any) {
        const errorId = serverId ?? fileId;
        updateFileStatus(errorId, "error");
        showToast(err?.message ?? "Upload failed", "error");
        setTimeout(() => removePendingFile(errorId), 3000);
      }
    },
    [addPendingFile, updateFileStatus, removePendingFile, showToast]
  );

  /** Open native file dialog and upload the selected file. */
  const uploadFile = useCallback(async () => {
    const filePath = await window.electronAPI.openFileDialog();
    if (!filePath) return;

    const fileData = await window.electronAPI.readFile(filePath);
    const { name, buffer, mimeType } = fileData;

    await processUpload(name, mimeType, () =>
      uploadAndProcessFile(buffer, name, mimeType)
    );
  }, [processUpload]);

  /** Upload a File/Blob directly (e.g. from drag-and-drop). */
  const uploadBlob = useCallback(
    async (file: File) => {
      const mimeType = file.type || "application/octet-stream";
      await processUpload(file.name, mimeType, () =>
        uploadAndProcessBlob(file, file.name, mimeType)
      );
    },
    [processUpload]
  );

  return { uploadFile, uploadBlob };
}
