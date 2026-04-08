import { useState } from "react";
import {
  useConversationStore,
  useChatStore,
  useFolderStore,
  assignChatToFolder,
} from "@opennative/shared";
import { SquarePen, Settings, FolderPlus, Folder } from "lucide-react";
import type { Conversation } from "@opennative/shared";
import { ConversationItem } from "./ConversationItem";
import { Modal } from "../ui/Modal";
import { FolderEditModal } from "../folders/FolderEditModal";
import { useToast } from "../ui/Toast";

interface SidebarProps {
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onOpenSettings: () => void;
}

function groupByDate(conversations: Conversation[]): Record<string, Conversation[]> {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const groups: Record<string, Conversation[]> = {
    Today: [],
    Yesterday: [],
    "Previous 7 Days": [],
    Older: [],
  };

  for (const conv of conversations) {
    const age = now - conv.createdAt;
    if (age < day) groups["Today"].push(conv);
    else if (age < 2 * day) groups["Yesterday"].push(conv);
    else if (age < 7 * day) groups["Previous 7 Days"].push(conv);
    else groups["Older"].push(conv);
  }

  return groups;
}

export function Sidebar({ onNewChat, onSelectConversation, onOpenSettings }: SidebarProps) {
  const conversations = useConversationStore((s) => s.conversations);
  const removeConversation = useConversationStore((s) => s.removeConversation);
  const renameConversation = useConversationStore((s) => s.renameConversation);
  const folders = useFolderStore((s) => s.folders);
  const currentConversationId = useChatStore((s) => s.currentConversationId);
  const { showToast } = useToast();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [movingConvId, setMovingConvId] = useState<string | null>(null);
  const [showFolderEdit, setShowFolderEdit] = useState(false);

  const handleRename = (conv: Conversation) => {
    setRenamingId(conv.id);
    setRenameText(conv.title ?? "");
  };

  const submitRename = async () => {
    if (!renamingId) return;
    const trimmed = renameText.trim();
    if (trimmed) {
      await renameConversation(renamingId, trimmed).catch(() =>
        showToast("Failed to rename", "error")
      );
    }
    setRenamingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this conversation?")) return;
    await removeConversation(id).catch(() => showToast("Failed to delete", "error"));
  };

  const handleMoveToFolder = (convId: string) => {
    setMovingConvId(convId);
  };

  const handleFolderSelect = async (folderId: string | null) => {
    if (!movingConvId) return;
    try {
      await assignChatToFolder(movingConvId, folderId);
      showToast(folderId ? "Moved to folder" : "Removed from folder", "success");
    } catch {
      showToast("Failed to move conversation", "error");
    }
    setMovingConvId(null);
  };

  const groups = groupByDate(conversations);
  const groupLabels = ["Today", "Yesterday", "Previous 7 Days", "Older"] as const;

  return (
    <div className="flex h-full flex-col bg-[#111111] no-select">
      {/* Top bar — padded for traffic lights (28px titlebar). The whole
          bar is a drag region; buttons opt out with app-no-drag. */}
      <div className="app-drag flex items-center justify-between px-3 pt-9 pb-2">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider select-none">Chats</span>
        <div className="app-no-drag flex items-center gap-1">
          <button
            onClick={() => setShowFolderEdit(true)}
            className="rounded-lg p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-700 transition-colors"
            title="New Folder"
          >
            <FolderPlus size={15} />
          </button>
          <button
            onClick={onNewChat}
            className="rounded-lg p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-700 transition-colors"
            title="New Chat"
          >
            <SquarePen size={15} />
          </button>
        </div>
      </div>

      {/* Folders */}
      {folders.length > 0 && (
        <div className="px-2 mb-1">
          {folders.map((folder) => (
            <button
              key={folder.id}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-neutral-400 hover:bg-neutral-800/60 hover:text-white transition-colors"
            >
              <Folder size={14} />
              <span className="truncate text-xs">{folder.name}</span>
            </button>
          ))}
          <div className="mt-1 h-px bg-neutral-800 mx-3" />
        </div>
      )}

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2">
        {groupLabels.map((label) => {
          const group = groups[label];
          if (!group.length) return null;
          return (
            <div key={label} className="mb-2">
              <p className="px-3 py-1 text-[11px] font-medium text-neutral-500">{label}</p>
              {group.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isSelected={currentConversationId === conv.id}
                  onSelect={() => onSelectConversation(conv.id)}
                  onRename={() => handleRename(conv)}
                  onDelete={() => handleDelete(conv.id)}
                  onMoveToFolder={() => handleMoveToFolder(conv.id)}
                />
              ))}
            </div>
          );
        })}
        {conversations.length === 0 && (
          <p className="px-3 py-8 text-center text-xs text-neutral-600">No conversations yet.</p>
        )}
      </div>

      {/* Settings button */}
      <div className="p-2 border-t border-neutral-800">
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
        >
          <Settings size={16} />
          <span className="text-sm">Settings</span>
        </button>
      </div>

      {/* Rename modal */}
      <Modal visible={!!renamingId} onClose={() => setRenamingId(null)}>
        <div className="px-4 py-3 border-b border-neutral-700">
          <h3 className="text-sm font-semibold text-white">Rename Chat</h3>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <input
            type="text"
            value={renameText}
            onChange={(e) => setRenameText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitRename()}
            autoFocus
            className="w-full rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-600"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setRenamingId(null)}
              className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submitRename}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 transition-colors"
            >
              Rename
            </button>
          </div>
        </div>
      </Modal>

      {/* Move to folder modal */}
      <Modal visible={!!movingConvId} onClose={() => setMovingConvId(null)} width="max-w-sm">
        <div className="px-4 py-3 border-b border-neutral-700">
          <h3 className="text-sm font-semibold text-white">Move to Folder</h3>
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          <button
            onClick={() => handleFolderSelect(null)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-400 hover:bg-neutral-700 transition-colors"
          >
            Remove from folder
          </button>
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => handleFolderSelect(folder.id)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-neutral-700/50 transition-colors"
            >
              <Folder size={14} className="text-neutral-400" />
              <span className="text-sm text-white">{folder.name}</span>
            </button>
          ))}
        </div>
      </Modal>

      {/* New folder modal */}
      <FolderEditModal
        visible={showFolderEdit}
        onClose={() => setShowFolderEdit(false)}
      />
    </div>
  );
}
