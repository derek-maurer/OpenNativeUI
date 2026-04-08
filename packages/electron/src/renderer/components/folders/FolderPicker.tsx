import { useFolderStore, useChatStore } from "@opennative/shared";
import { Folder, FolderOpen, Check, MinusCircle } from "lucide-react";
import { Modal } from "../ui/Modal";

interface FolderPickerProps {
  visible: boolean;
  onClose: () => void;
}

export function FolderPicker({ visible, onClose }: FolderPickerProps) {
  const folders = useFolderStore((s) => s.folders);
  const pendingFolderId = useChatStore((s) => s.pendingFolderId);
  const setPendingFolderId = useChatStore((s) => s.setPendingFolderId);

  const handleSelect = (folderId: string | null) => {
    setPendingFolderId(folderId);
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} width="max-w-sm">
      <div className="px-4 py-3 border-b border-neutral-700">
        <h3 className="text-sm font-semibold text-white">Add to Folder</h3>
      </div>
      <div className="max-h-80 overflow-y-auto p-2">
        <button
          onClick={() => handleSelect(null)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-neutral-700/50 transition-colors"
        >
          <MinusCircle size={16} className="text-neutral-400" />
          <span className="flex-1 text-sm text-neutral-400">No folder</span>
          {pendingFolderId === null && <Check size={14} className="text-primary" />}
        </button>

        {folders.map((folder) => {
          const isSelected = pendingFolderId === folder.id;
          return (
            <button
              key={folder.id}
              onClick={() => handleSelect(folder.id)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-neutral-700/50 transition-colors"
            >
              {isSelected ? (
                <FolderOpen size={16} className="shrink-0 text-primary" />
              ) : (
                <Folder size={16} className="shrink-0 text-neutral-400" />
              )}
              <span className="flex-1 truncate text-sm text-white">{folder.name}</span>
              {isSelected && <Check size={14} className="shrink-0 text-primary" />}
            </button>
          );
        })}

        {folders.length === 0 && (
          <p className="px-3 py-4 text-center text-xs text-neutral-500">
            No folders yet. Create one in the sidebar.
          </p>
        )}
      </div>
    </Modal>
  );
}
