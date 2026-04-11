import { Pencil, Trash2 } from "lucide-react";

interface FolderContextMenuProps {
  x: number;
  y: number;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function FolderContextMenu({
  x,
  y,
  onRename,
  onDelete,
  onClose,
}: FolderContextMenuProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        className="fixed z-50 w-44 rounded-xl bg-surface border border-line-strong shadow-2xl py-1"
        style={{ left: x, top: y }}
      >
        <button
          onClick={onRename}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-fg hover:bg-hover transition-colors"
        >
          <Pencil size={14} />
          Rename
        </button>
        <div className="my-1 h-px bg-line-strong" />
        <button
          onClick={onDelete}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-hover transition-colors"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </>
  );
}
