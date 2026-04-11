import { Folder } from "lucide-react";
import type { Folder as FolderType } from "@opennative/shared";
import { Modal } from "../ui/Modal";

interface MoveToFolderDialogProps {
  visible: boolean;
  folders: FolderType[];
  onSelect: (folderId: string | null) => void;
  onClose: () => void;
}

export function MoveToFolderDialog({
  visible,
  folders,
  onSelect,
  onClose,
}: MoveToFolderDialogProps) {
  return (
    <Modal visible={visible} onClose={onClose} width="max-w-sm">
      <div className="px-4 py-3 border-b border-line-strong">
        <h3 className="text-sm font-semibold text-fg">Move to Folder</h3>
      </div>
      <div className="max-h-64 overflow-y-auto p-2">
        <button
          onClick={() => onSelect(null)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-secondary hover:bg-hover transition-colors"
        >
          Remove from folder
        </button>
        {folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => onSelect(folder.id)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-hover transition-colors"
          >
            <Folder size={14} className="text-secondary" />
            <span className="text-sm text-fg">{folder.name}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
