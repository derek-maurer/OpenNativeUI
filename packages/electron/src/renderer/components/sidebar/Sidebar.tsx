import type { Conversation } from "@opennative/shared";
import {
  useChatStore,
  useConversationStore,
  useFolderStore,
} from "@opennative/shared";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  MessageSquare,
  Pencil,
  Search,
  Settings,
  SquarePen,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FolderDataModal } from "../folders/FolderDataModal";
import { FolderEditModal } from "../folders/FolderEditModal";
import { Modal } from "../ui/Modal";
import { Tooltip } from "../ui/Tooltip";
import { useToast } from "../ui/Toast";
import { ConversationItem } from "./ConversationItem";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onOpenSettings: () => void;
  onOpenSearch: () => void;
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

export function Sidebar({ isCollapsed, onToggleCollapse, onNewChat, onSelectConversation, onOpenSettings, onOpenSearch }: SidebarProps) {
  const conversations = useConversationStore((s) => s.conversations);
  const removeConversation = useConversationStore((s) => s.removeConversation);
  const renameConversation = useConversationStore((s) => s.renameConversation);
  const moveConversationToFolder = useConversationStore((s) => s.moveConversationToFolder);
  const folders = useFolderStore((s) => s.folders);
  const deleteFolder = useFolderStore((s) => s.deleteFolder);
  const loadFolder = useFolderStore((s) => s.loadFolder);
  const currentConversationId = useChatStore((s) => s.currentConversationId);
  const { showToast } = useToast();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [movingConvId, setMovingConvId] = useState<string | null>(null);
  const [showFolderEdit, setShowFolderEdit] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [showFolderData, setShowFolderData] = useState(false);
  const [foldersExpanded, setFoldersExpanded] = useState(false);

  const FOLDERS_LIMIT = 5;
  const visibleFolders = foldersExpanded ? folders : folders.slice(0, FOLDERS_LIMIT);
  const hasMoreFolders = folders.length > FOLDERS_LIMIT;
  const [folderContextMenu, setFolderContextMenu] = useState<{
    folderId: string;
    x: number;
    y: number;
  } | null>(null);

  // Load folder data (system prompt + files) when entering folder detail
  useEffect(() => {
    if (selectedFolderId) {
      loadFolder(selectedFolderId);
    }
  }, [selectedFolderId, loadFolder]);

  const selectedFolder = useMemo(
    () => folders.find((f) => f.id === selectedFolderId),
    [folders, selectedFolderId]
  );

  const folderConversations = useMemo(
    () =>
      conversations
        .filter((c) => c.folderId === selectedFolderId)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations, selectedFolderId]
  );

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
      await moveConversationToFolder(movingConvId, folderId);
      showToast(folderId ? "Moved to folder" : "Removed from folder", "success");
    } catch {
      showToast("Failed to move conversation", "error");
    }
    setMovingConvId(null);
  };

  const handleFolderContextMenu = (e: React.MouseEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setFolderContextMenu({ folderId, x: e.clientX, y: e.clientY });
  };

  const handleDeleteFolder = async (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!window.confirm(`Delete "${folder?.name ?? "folder"}"? Conversations inside will be unfoldered.`)) return;
    try {
      await deleteFolder(folderId);
      if (selectedFolderId === folderId) setSelectedFolderId(null);
      showToast("Folder deleted", "success");
    } catch {
      showToast("Failed to delete folder", "error");
    }
  };

  const groups = groupByDate(conversations);
  const groupLabels = ["Today", "Yesterday", "Previous 7 Days", "Older"] as const;

  // ── Collapsed (icon-only) mode ────────────────────────────────────────────
  if (isCollapsed) {
    return (
      <div className="flex h-full flex-col items-center bg-[#111111] no-select">
        {/* Expand button */}
        <div className="app-drag flex w-full items-center justify-center pt-9 pb-2">
          <Tooltip label="Expand sidebar" side="right">
            <button
              onClick={onToggleCollapse}
              className="app-no-drag rounded-lg p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-700 transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </Tooltip>
        </div>

        {/* Action icons */}
        <div className="flex flex-col items-center gap-1 px-1 w-full">
          <Tooltip label="New Chat" shortcut="⇧⌘O" side="right">
            <button
              onClick={onNewChat}
              className="rounded-lg p-2 text-neutral-500 hover:text-white hover:bg-neutral-700 transition-colors"
            >
              <SquarePen size={16} />
            </button>
          </Tooltip>
          <Tooltip label="Search" shortcut="⌘K" side="right">
            <button
              onClick={onOpenSearch}
              className="rounded-lg p-2 text-neutral-500 hover:text-white hover:bg-neutral-700 transition-colors"
            >
              <Search size={16} />
            </button>
          </Tooltip>
          <Tooltip label="Folders" side="right">
            <button
              onClick={() => setFoldersExpanded((v) => !v)}
              className="rounded-lg p-2 text-neutral-500 hover:text-white hover:bg-neutral-700 transition-colors"
            >
              <Folder size={16} />
            </button>
          </Tooltip>
        </div>

        {/* Settings */}
        <div className="mt-auto w-full flex items-center justify-center border-t border-neutral-800 py-3">
          <Tooltip label="Settings" shortcut="⌘," side="right">
            <button
              onClick={onOpenSettings}
              className="rounded-lg p-2 text-neutral-500 hover:text-white hover:bg-neutral-700 transition-colors"
            >
              <Settings size={16} />
            </button>
          </Tooltip>
        </div>
      </div>
    );
  }

  // ── Folder detail view ────────────────────────────────────────────────────
  if (selectedFolderId && selectedFolder) {
    const systemPrompt = selectedFolder.data?.system_prompt;
    const attachedFiles = selectedFolder.data?.files ?? [];
    const folderGroups = groupByDate(folderConversations);

    return (
      <div className="flex h-full flex-col bg-[#111111] no-select">
        {/* Header */}
        <div className="app-drag flex items-center gap-1 px-3 pt-9 pb-2">
          <Tooltip label="Back">
            <button
              onClick={() => setSelectedFolderId(null)}
              className="app-no-drag rounded-lg p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-700 transition-colors shrink-0"
            >
              <ArrowLeft size={15} />
            </button>
          </Tooltip>
          <div className="flex-1 flex items-center gap-1.5 min-w-0">
            <Folder size={13} className="shrink-0 text-neutral-400" />
            <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider truncate select-none">
              {selectedFolder.name}
            </span>
          </div>
          <Tooltip label="Edit folder">
            <button
              onClick={() => setShowFolderData(true)}
              className="app-no-drag rounded-lg p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-700 transition-colors shrink-0"
            >
              <Pencil size={13} />
            </button>
          </Tooltip>
        </div>

        {/* System prompt / files info card */}
        {(systemPrompt || attachedFiles.length > 0) && (
          <div
            className="mx-2 mb-2 rounded-xl bg-neutral-800/60 border border-neutral-700/50 p-3 cursor-pointer hover:bg-neutral-800 transition-colors"
            onClick={() => setShowFolderData(true)}
          >
            {systemPrompt && (
              <div className="flex items-start gap-2 mb-2">
                <MessageSquare size={13} className="shrink-0 text-neutral-500 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide mb-0.5">
                    System Prompt
                  </p>
                  <p className="text-xs text-neutral-300 line-clamp-2">{systemPrompt}</p>
                </div>
              </div>
            )}
            {attachedFiles.length > 0 && (
              <div className="flex items-start gap-2">
                <Folder size={13} className="shrink-0 text-neutral-500 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide mb-0.5">
                    {attachedFiles.length} {attachedFiles.length === 1 ? "file" : "files"}
                  </p>
                  <p className="text-xs text-neutral-400 truncate">
                    {attachedFiles.map((f) => f.name ?? f.id).join(", ")}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Conversations in folder */}
        <div className="flex-1 overflow-y-auto px-2">
          {folderConversations.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-12 gap-2 text-center">
              <FolderOpen size={32} className="text-neutral-700" />
              <p className="text-xs text-neutral-500 mt-1">No conversations in this folder</p>
              <p className="text-[11px] text-neutral-600">
                Right-click a conversation and choose "Move to Folder"
              </p>
            </div>
          ) : (
            groupLabels.map((label) => {
              const group = folderGroups[label];
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
            })
          )}
        </div>

        {/* Settings button */}
        <div className="flex items-center px-2 h-[63px] border-t border-neutral-800">
          <button
            onClick={onOpenSettings}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <Settings size={16} />
            <span className="text-sm">Settings</span>
            <span className="ml-auto font-mono text-[11px] text-neutral-600">⌘,</span>
          </button>
        </div>

        {/* Rename conversation modal */}
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

        {/* Edit folder (name + system prompt + files) */}
        <FolderDataModal
          key={selectedFolder.id}
          visible={showFolderData}
          onClose={() => setShowFolderData(false)}
          folder={selectedFolder}
        />
      </div>
    );
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col bg-[#111111] no-select">
      {/* Top bar */}
      <div className="app-drag flex items-center justify-between px-3 pt-9 pb-2">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider select-none">Chats</span>
        <div className="app-no-drag flex items-center gap-1">
          <Tooltip label="Search" shortcut="⌘K">
            <button
              onClick={onOpenSearch}
              className="rounded-lg p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-700 transition-colors"
            >
              <Search size={15} />
            </button>
          </Tooltip>
          <Tooltip label="New Folder">
            <button
              onClick={() => setShowFolderEdit(true)}
              className="rounded-lg p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-700 transition-colors"
            >
              <FolderPlus size={15} />
            </button>
          </Tooltip>
          <Tooltip label="New Chat" shortcut="⇧⌘O">
            <button
              onClick={onNewChat}
              className="rounded-lg p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-700 transition-colors"
            >
              <SquarePen size={15} />
            </button>
          </Tooltip>
          <Tooltip label="Collapse sidebar" shortcut="⌘.">
            <button
              onClick={onToggleCollapse}
              className="rounded-lg p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-700 transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Folders */}
      {folders.length > 0 && (
        <div className="px-2 mb-1">
          {visibleFolders.map((folder) => {
            const count = conversations.filter((c) => c.folderId === folder.id).length;
            return (
              <button
                key={folder.id}
                onClick={() => setSelectedFolderId(folder.id)}
                onContextMenu={(e) => handleFolderContextMenu(e, folder.id)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-neutral-400 hover:bg-neutral-800/60 hover:text-white transition-colors group"
              >
                <Folder size={14} className="shrink-0" />
                <span className="flex-1 truncate text-xs text-left">{folder.name}</span>
                {count > 0 && (
                  <span className="text-[10px] text-neutral-600 group-hover:text-neutral-500 shrink-0">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          {hasMoreFolders && (
            <button
              onClick={() => setFoldersExpanded((v) => !v)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-neutral-600 hover:text-neutral-400 transition-colors text-xs"
            >
              {foldersExpanded
                ? `Show less`
                : `${folders.length - FOLDERS_LIMIT} more folder${folders.length - FOLDERS_LIMIT === 1 ? "" : "s"}`}
            </button>
          )}
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
      <div className="flex items-center px-2 h-[63px] border-t border-neutral-800">
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
        >
          <Settings size={16} />
          <span className="text-sm">Settings</span>
          <span className="ml-auto font-mono text-[11px] text-neutral-600">⌘,</span>
        </button>
      </div>

      {/* Rename conversation modal */}
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

      {/* Rename folder modal */}
      <FolderEditModal
        key={renamingFolderId ?? "none"}
        visible={!!renamingFolderId}
        onClose={() => setRenamingFolderId(null)}
        folderId={renamingFolderId ?? undefined}
      />

      {/* Folder context menu */}
      {folderContextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setFolderContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setFolderContextMenu(null); }}
          />
          <div
            className="fixed z-50 w-44 rounded-xl bg-[#1a1a1a] border border-neutral-700 shadow-2xl py-1"
            style={{ left: folderContextMenu.x, top: folderContextMenu.y }}
          >
            <button
              onClick={() => {
                setRenamingFolderId(folderContextMenu.folderId);
                setFolderContextMenu(null);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
            >
              <Pencil size={14} />
              Rename
            </button>
            <div className="my-1 h-px bg-neutral-700" />
            <button
              onClick={() => {
                handleDeleteFolder(folderContextMenu.folderId);
                setFolderContextMenu(null);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-neutral-700 transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
