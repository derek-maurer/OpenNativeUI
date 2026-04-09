import { useState, useRef } from "react";
import { Pencil, Trash2, FolderOpen } from "lucide-react";
import type { Conversation } from "@opennative/shared";

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
  onMoveToFolder: () => void;
}

export function ConversationItem({
  conversation,
  isSelected,
  onSelect,
  onRename,
  onDelete,
  onMoveToFolder,
}: ConversationItemProps) {
  const [showActions, setShowActions] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenuPos(null);

  return (
    <>
      <div
        ref={itemRef}
        className={`group relative flex items-center rounded-lg px-3 py-2 cursor-pointer transition-colors ${
          isSelected
            ? "bg-hover text-fg"
            : "text-fg hover:bg-hover"
        }`}
        onClick={onSelect}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <span className="flex-1 truncate text-sm">{conversation.title || "New Chat"}</span>

        {/* Hover action buttons */}
        {showActions && !contextMenuPos && (
          <div
            className="flex shrink-0 items-center gap-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onRename}
              className="rounded p-1 text-secondary hover:text-fg hover:bg-hover transition-colors"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={onDelete}
              className="rounded p-1 text-secondary hover:text-red-400 hover:bg-hover transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenuPos && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={closeContextMenu}
            onContextMenu={(e) => { e.preventDefault(); closeContextMenu(); }}
          />
          <div
            className="fixed z-50 w-44 rounded-xl bg-surface border border-line-strong shadow-2xl py-1"
            style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          >
            <button
              onClick={() => { onRename(); closeContextMenu(); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-fg hover:bg-hover hover:text-fg transition-colors"
            >
              <Pencil size={14} />
              Rename
            </button>
            <button
              onClick={() => { onMoveToFolder(); closeContextMenu(); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-fg hover:bg-hover hover:text-fg transition-colors"
            >
              <FolderOpen size={14} />
              Move to Folder
            </button>
            <div className="my-1 h-px bg-line-strong" />
            <button
              onClick={() => { onDelete(); closeContextMenu(); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-hover transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </>
      )}
    </>
  );
}
