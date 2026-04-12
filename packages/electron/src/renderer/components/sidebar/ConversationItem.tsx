import { useState, useRef } from "react";
import {
  Pencil,
  Trash2,
  FolderOpen,
  Pin,
  Archive,
  Share2,
  Copy,
  Download,
} from "lucide-react";
import type { Conversation } from "@opennative/shared";

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
  onMoveToFolder: () => void;
  onPin: () => void;
  onArchive: () => void;
  onShare: () => void;
  onClone: () => void;
  onDownload: () => void;
}

export function ConversationItem({
  conversation,
  isSelected,
  onSelect,
  onRename,
  onDelete,
  onMoveToFolder,
  onPin,
  onArchive,
  onShare,
  onClone,
  onDownload,
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
              onClick={() => { onShare(); closeContextMenu(); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-fg hover:bg-hover hover:text-fg transition-colors"
            >
              <Share2 size={14} />
              Share
            </button>
            <button
              onClick={() => { onDownload(); closeContextMenu(); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-fg hover:bg-hover hover:text-fg transition-colors"
            >
              <Download size={14} />
              Download
            </button>
            <button
              onClick={() => { onRename(); closeContextMenu(); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-fg hover:bg-hover hover:text-fg transition-colors"
            >
              <Pencil size={14} />
              Rename
            </button>
            <button
              onClick={() => { onPin(); closeContextMenu(); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-fg hover:bg-hover hover:text-fg transition-colors"
            >
              <Pin size={14} />
              {conversation.pinned ? "Unpin" : "Pin"}
            </button>
            <button
              onClick={() => { onClone(); closeContextMenu(); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-fg hover:bg-hover hover:text-fg transition-colors"
            >
              <Copy size={14} />
              Clone
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
              onClick={() => { onArchive(); closeContextMenu(); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-fg hover:bg-hover hover:text-fg transition-colors"
            >
              <Archive size={14} />
              Archive
            </button>
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
