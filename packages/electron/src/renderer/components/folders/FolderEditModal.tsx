import { useState, useEffect } from "react";
import { useFolderStore } from "@opennative/shared";
import { Folder } from "lucide-react";
import { Modal } from "../ui/Modal";
import { useToast } from "../ui/Toast";

interface FolderEditModalProps {
  visible: boolean;
  onClose: () => void;
  folderId?: string; // undefined = create new
}

export function FolderEditModal({ visible, onClose, folderId }: FolderEditModalProps) {
  const folders = useFolderStore((s) => s.folders);
  const createFolder = useFolderStore((s) => s.createFolder);
  const updateFolderName = useFolderStore((s) => s.updateFolderName);
  const { showToast } = useToast();

  const existingFolder = folderId ? folders.find((f) => f.id === folderId) : undefined;
  const [name, setName] = useState(existingFolder?.name ?? "");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(existingFolder?.name ?? "");
    }
  }, [visible]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setIsLoading(true);
    try {
      if (existingFolder) {
        await updateFolderName(existingFolder.id, trimmed);
        showToast("Folder renamed", "success");
      } else {
        await createFolder(trimmed);
        showToast("Folder created", "success");
      }
      onClose();
    } catch {
      showToast("Failed to save folder", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} width="max-w-sm">
      <div className="px-4 py-3 border-b border-neutral-700">
        <h3 className="text-sm font-semibold text-white">
          {existingFolder ? "Rename Folder" : "New Folder"}
        </h3>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-2.5">
          <Folder size={16} className="shrink-0 text-neutral-400" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSubmit()}
            placeholder="Folder name"
            autoFocus
            className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || isLoading}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Saving…" : existingFolder ? "Rename" : "Create"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
