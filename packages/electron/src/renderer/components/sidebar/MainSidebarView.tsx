import type { Conversation, Folder as FolderType } from "@opennative/shared";
import { groupConversationsByDate } from "@opennative/shared";
import {
  ChevronLeft,
  Folder,
  FolderPlus,
  Pin,
  Search,
  Settings,
  SquarePen,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Tooltip } from "../ui/Tooltip";
import { ConversationItem } from "./ConversationItem";

const FOLDERS_LIMIT = 5;

interface MainSidebarViewProps {
  folders: FolderType[];
  conversations: Conversation[];
  currentConversationId: string | null;
  onNewChat: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onToggleCollapse: () => void;
  onOpenNewFolder: () => void;
  onSelectFolder: (id: string) => void;
  onFolderContextMenu: (e: React.MouseEvent, folderId: string) => void;
  onSelectConversation: (id: string) => void;
  onRenameConversation: (conv: Conversation) => void;
  onDeleteConversation: (id: string) => void;
  onMoveConversation: (id: string) => void;
  onPinConversation: (conv: Conversation) => void;
  onArchiveConversation: (id: string) => void;
  onShareConversation: (id: string) => void;
  onCloneConversation: (id: string) => void;
  onDownloadConversation: (id: string) => void;
}

export function MainSidebarView({
  folders,
  conversations,
  currentConversationId,
  onNewChat,
  onOpenSearch,
  onOpenSettings,
  onToggleCollapse,
  onOpenNewFolder,
  onSelectFolder,
  onFolderContextMenu,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  onMoveConversation,
  onPinConversation,
  onArchiveConversation,
  onShareConversation,
  onCloneConversation,
  onDownloadConversation,
}: MainSidebarViewProps) {
  const [foldersExpanded, setFoldersExpanded] = useState(false);

  const visibleFolders = foldersExpanded ? folders : folders.slice(0, FOLDERS_LIMIT);
  const hasMoreFolders = folders.length > FOLDERS_LIMIT;

  const pinnedConversations = useMemo(
    () => conversations.filter((c) => c.pinned),
    [conversations]
  );
  const unpinnedConversations = useMemo(
    () => conversations.filter((c) => !c.pinned),
    [conversations]
  );
  const groups = groupConversationsByDate(unpinnedConversations);

  return (
    <div className="flex h-full flex-col bg-sidebar no-select">
      {/* Top bar */}
      <div className="app-drag flex items-center justify-between px-3 pt-9 pb-2">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider select-none">
          Chats
        </span>
        <div className="app-no-drag flex items-center gap-1">
          <Tooltip label="Search" shortcut="⌘K">
            <button
              onClick={onOpenSearch}
              className="rounded-lg p-1.5 text-muted hover:text-fg hover:bg-hover transition-colors"
            >
              <Search size={15} />
            </button>
          </Tooltip>
          <Tooltip label="New Folder">
            <button
              onClick={onOpenNewFolder}
              className="rounded-lg p-1.5 text-muted hover:text-fg hover:bg-hover transition-colors"
            >
              <FolderPlus size={15} />
            </button>
          </Tooltip>
          <Tooltip label="New Chat" shortcut="⇧⌘O">
            <button
              onClick={onNewChat}
              className="rounded-lg p-1.5 text-muted hover:text-fg hover:bg-hover transition-colors"
            >
              <SquarePen size={15} />
            </button>
          </Tooltip>
          <Tooltip label="Collapse sidebar" shortcut="⌘.">
            <button
              onClick={onToggleCollapse}
              className="rounded-lg p-1.5 text-muted hover:text-fg hover:bg-hover transition-colors"
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
                onClick={() => onSelectFolder(folder.id)}
                onContextMenu={(e) => onFolderContextMenu(e, folder.id)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-secondary hover:bg-hover hover:text-fg transition-colors group"
              >
                <Folder size={14} className="shrink-0" />
                <span className="flex-1 truncate text-xs text-left">{folder.name}</span>
                {count > 0 && (
                  <span className="text-[10px] text-dim group-hover:text-muted shrink-0">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          {hasMoreFolders && (
            <button
              onClick={() => setFoldersExpanded((v) => !v)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-dim hover:text-secondary transition-colors text-xs"
            >
              {foldersExpanded
                ? `Show less`
                : `${folders.length - FOLDERS_LIMIT} more folder${folders.length - FOLDERS_LIMIT === 1 ? "" : "s"}`}
            </button>
          )}
          <div className="mt-1 h-px bg-line mx-3" />
        </div>
      )}

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2">
        {/* Pinned section */}
        {pinnedConversations.length > 0 && (
          <div className="mb-2">
            <p className="flex items-center gap-1 px-3 py-1 text-[11px] font-medium text-muted">
              <Pin size={10} />
              Pinned
            </p>
            {pinnedConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isSelected={currentConversationId === conv.id}
                onSelect={() => onSelectConversation(conv.id)}
                onRename={() => onRenameConversation(conv)}
                onDelete={() => onDeleteConversation(conv.id)}
                onMoveToFolder={() => onMoveConversation(conv.id)}
                onPin={() => onPinConversation(conv)}
                onArchive={() => onArchiveConversation(conv.id)}
                onShare={() => onShareConversation(conv.id)}
                onClone={() => onCloneConversation(conv.id)}
                onDownload={() => onDownloadConversation(conv.id)}
              />
            ))}
          </div>
        )}

        {groups.map(({ title, data }) => (
          <div key={title} className="mb-2">
            <p className="px-3 py-1 text-[11px] font-medium text-muted">{title}</p>
            {data.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isSelected={currentConversationId === conv.id}
                onSelect={() => onSelectConversation(conv.id)}
                onRename={() => onRenameConversation(conv)}
                onDelete={() => onDeleteConversation(conv.id)}
                onMoveToFolder={() => onMoveConversation(conv.id)}
                onPin={() => onPinConversation(conv)}
                onArchive={() => onArchiveConversation(conv.id)}
                onShare={() => onShareConversation(conv.id)}
                onClone={() => onCloneConversation(conv.id)}
                onDownload={() => onDownloadConversation(conv.id)}
              />
            ))}
          </div>
        ))}
        {conversations.length === 0 && (
          <p className="px-3 py-8 text-center text-xs text-dim">No conversations yet.</p>
        )}
      </div>

      {/* Settings button */}
      <div className="flex items-center px-2 h-[63px] border-t border-line">
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-secondary hover:bg-hover hover:text-fg transition-colors"
        >
          <Settings size={16} />
          <span className="text-sm">Settings</span>
          <span className="ml-auto font-mono text-[11px] text-dim">⌘,</span>
        </button>
      </div>
    </div>
  );
}
