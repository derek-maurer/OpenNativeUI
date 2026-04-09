import { useState, useEffect, useCallback, useRef } from "react";
import {
  useFolderStore,
  useAuthStore,
  pollUntilReady,
  type Folder,
  type FolderFileRef,
} from "@opennative/shared";
import { X, FileText, Image, Loader2, XCircle, Paperclip } from "lucide-react";
import { Modal } from "../ui/Modal";
import { useToast } from "../ui/Toast";

interface FolderDataModalProps {
  visible: boolean;
  onClose: () => void;
  folder: Folder | undefined;
}

type PendingFile = FolderFileRef & {
  pending?: boolean;
  error?: boolean;
};

async function uploadFileBrowser(
  file: File,
  serverUrl: string,
  token: string
): Promise<{ id: string }> {
  const base = serverUrl.replace(/\/+$/, "");
  const formData = new FormData();
  formData.append("file", file, file.name);

  const res = await fetch(`${base}/api/v1/files/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  return res.json();
}

export function FolderDataModal({ visible, onClose, folder }: FolderDataModalProps) {
  const renameFolder = useFolderStore((s) => s.renameFolder);
  const updateFolderData = useFolderStore((s) => s.updateFolderData);
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !folder) return;
    setName(folder.name);
    setSystemPrompt(folder.data?.system_prompt ?? "");
    setFiles(folder.data?.files ?? []);
  }, [visible, folder?.id, folder?.name, folder?.data]);

  const hasPendingUploads = files.some((f) => f.pending);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const picked = Array.from(e.target.files ?? []);
      // Reset input so the same file can be re-picked
      e.target.value = "";
      if (!picked.length) return;

      const { serverUrl, token } = useAuthStore.getState();

      for (const file of picked) {
        const placeholderId = `local-${Date.now()}-${Math.random()}`;
        setFiles((prev) => [
          ...prev,
          { type: "file", id: placeholderId, name: file.name, pending: true },
        ]);

        const isImage = file.type.startsWith("image/");

        try {
          const { id: serverId } = await uploadFileBrowser(file, serverUrl, token ?? "");

          setFiles((prev) =>
            prev.map((f) =>
              f.id === placeholderId
                ? { type: "file", id: serverId, name: file.name, pending: !isImage }
                : f
            )
          );

          if (!isImage) {
            try {
              await pollUntilReady(serverId);
            } catch {
              // pollUntilReady throws on "failed" status — treat as uploaded anyway
            }
            setFiles((prev) =>
              prev.map((f) => (f.id === serverId ? { ...f, pending: false } : f))
            );
          }
        } catch (err) {
          console.error("[FolderDataModal] upload failed:", err);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === placeholderId ? { ...f, pending: false, error: true } : f
            )
          );
        }
      }
    },
    []
  );

  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleSave = async () => {
    if (!folder) return;
    if (hasPendingUploads) {
      showToast("Wait for uploads to finish before saving", "error");
      return;
    }

    setSaving(true);
    try {
      const trimmedName = name.trim();
      if (trimmedName && trimmedName !== folder.name) {
        await renameFolder(folder.id, trimmedName);
      }

      const cleanFiles: FolderFileRef[] = files
        .filter((f) => !f.error && !f.pending)
        .map(({ type, id, name }) => ({ type, id, name }));

      const trimmedPrompt = systemPrompt.trim();
      const dataPatch: { system_prompt?: string; files: FolderFileRef[] } = {
        files: cleanFiles,
      };
      if (trimmedPrompt) {
        dataPatch.system_prompt = trimmedPrompt;
      }

      await updateFolderData(folder.id, dataPatch);
      showToast("Folder saved", "success");
      onClose();
    } catch (err) {
      console.error("[FolderDataModal] save failed:", err);
      showToast("Failed to save folder", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!folder) return null;

  return (
    <Modal visible={visible} onClose={onClose} width="max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line-strong">
        <h3 className="text-sm font-semibold text-fg">Edit Folder</h3>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-secondary hover:text-fg hover:bg-hover transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="overflow-y-auto max-h-[70vh] p-4 flex flex-col gap-4">
        {/* Folder name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-secondary uppercase tracking-wide">
            Folder Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Folder name"
            className="w-full rounded-xl bg-surface border border-line-strong px-3 py-2.5 text-sm text-fg placeholder-muted focus:outline-none focus:border-muted"
          />
        </div>

        {/* System prompt */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-secondary uppercase tracking-wide">
            System Prompt
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Write your model system prompt content here..."
            rows={5}
            className="w-full rounded-xl bg-surface border border-line-strong px-3 py-2.5 text-sm text-fg placeholder-muted focus:outline-none focus:border-muted resize-none"
          />
        </div>

        {/* Files */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-secondary uppercase tracking-wide">
            Files
          </label>

          {files.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {files.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-surface ${
                    file.error ? "border border-red-500/40" : "border border-line-strong"
                  }`}
                >
                  {file.type === "collection" ? (
                    <Image size={14} className="shrink-0 text-secondary" />
                  ) : (
                    <FileText size={14} className={`shrink-0 ${file.error ? "text-red-400" : "text-secondary"}`} />
                  )}
                  <span className={`flex-1 truncate text-sm ${file.error ? "text-red-400" : "text-fg"}`}>
                    {file.name ?? file.id}
                  </span>
                  {file.pending ? (
                    <Loader2 size={14} className="shrink-0 text-primary animate-spin" />
                  ) : (
                    <button
                      onClick={() => handleRemoveFile(file.id)}
                      className="shrink-0 text-muted hover:text-fg transition-colors"
                    >
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.md,.csv,.docx,image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl border border-line-strong px-3 py-2.5 text-sm text-secondary hover:text-fg hover:border-muted hover:bg-hover transition-colors"
          >
            <Paperclip size={14} />
            Attach Files
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-2 justify-end px-4 py-3 border-t border-line-strong">
        <button
          onClick={onClose}
          className="rounded-lg border border-line-strong px-3 py-1.5 text-sm text-secondary hover:text-fg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || hasPendingUploads}
          className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}
