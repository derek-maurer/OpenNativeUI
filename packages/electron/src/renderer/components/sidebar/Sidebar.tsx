import type { Conversation } from "@opennative/shared";
import {
  useChatStore,
  useConversationStore,
  useFolderStore,
  fetchConversation,
} from "@opennative/shared";
import { useAuthStore } from "@opennative/shared";
import { useEffect, useMemo, useState } from "react";
import { FolderEditModal } from "../folders/FolderEditModal";
import { useToast } from "../ui/Toast";
import { CollapsedSidebar } from "./CollapsedSidebar";
import { FolderContextMenu } from "./FolderContextMenu";
import { FolderDetailView } from "./FolderDetailView";
import { MainSidebarView } from "./MainSidebarView";
import { MoveToFolderDialog } from "./MoveToFolderDialog";
import { RenameConversationDialog } from "./RenameConversationDialog";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onOpenSettings: () => void;
  onOpenSearch: () => void;
}

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  onNewChat,
  onSelectConversation,
  onOpenSettings,
  onOpenSearch,
}: SidebarProps) {
  const conversations = useConversationStore((s) => s.conversations);
  const removeConversation = useConversationStore((s) => s.removeConversation);
  const renameConversation = useConversationStore((s) => s.renameConversation);
  const moveConversationToFolder = useConversationStore((s) => s.moveConversationToFolder);
  const pinConv = useConversationStore((s) => s.pinConversation);
  const archiveConv = useConversationStore((s) => s.archiveConversation);
  const shareConv = useConversationStore((s) => s.shareConversation);
  const cloneConv = useConversationStore((s) => s.cloneConversation);
  const serverUrl = useAuthStore((s) => s.serverUrl);
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

  const handlePin = async (conv: Conversation) => {
    try {
      await pinConv(conv.id, !conv.pinned);
      showToast(conv.pinned ? "Unpinned" : "Pinned", "success");
    } catch {
      showToast("Failed to pin", "error");
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveConv(id);
      showToast("Archived", "success");
    } catch {
      showToast("Failed to archive", "error");
    }
  };

  const handleShare = async (id: string) => {
    try {
      const shareId = await shareConv(id);
      const shareUrl = `${serverUrl.replace(/\/+$/, "")}/s/${shareId}`;
      await navigator.clipboard.writeText(shareUrl);
      showToast("Share link copied", "success");
    } catch {
      showToast("Failed to share", "error");
    }
  };

  const handleClone = async (id: string) => {
    try {
      await cloneConv(id);
      showToast("Conversation cloned", "success");
    } catch {
      showToast("Failed to clone", "error");
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const serverConv = await fetchConversation(id);
      const json = JSON.stringify(serverConv, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${serverConv.chat?.title ?? "chat"}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      showToast("Failed to download", "error");
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (
      !window.confirm(
        `Delete "${folder?.name ?? "folder"}"? Conversations inside will be unfoldered.`
      )
    )
      return;
    try {
      await deleteFolder(folderId);
      if (selectedFolderId === folderId) setSelectedFolderId(null);
      showToast("Folder deleted", "success");
    } catch {
      showToast("Failed to delete folder", "error");
    }
  };

  // ── Collapsed mode ────────────────────────────────────────────────────────
  if (isCollapsed) {
    return (
      <CollapsedSidebar
        onToggleCollapse={onToggleCollapse}
        onNewChat={onNewChat}
        onOpenSearch={onOpenSearch}
        onOpenSettings={onOpenSettings}
        onToggleFolders={onToggleCollapse}
      />
    );
  }

  // ── Folder detail or main view + shared modals ────────────────────────────
  return (
    <>
      {selectedFolderId && selectedFolder ? (
        <FolderDetailView
          folder={selectedFolder}
          conversations={folderConversations}
          currentConversationId={currentConversationId}
          onBack={() => setSelectedFolderId(null)}
          onOpenSettings={onOpenSettings}
          onSelectConversation={onSelectConversation}
          onRenameConversation={handleRename}
          onDeleteConversation={handleDelete}
          onMoveConversation={setMovingConvId}
          onPinConversation={handlePin}
          onArchiveConversation={handleArchive}
          onShareConversation={handleShare}
          onCloneConversation={handleClone}
          onDownloadConversation={handleDownload}
        />
      ) : (
        <MainSidebarView
          folders={folders}
          conversations={conversations}
          currentConversationId={currentConversationId}
          onNewChat={onNewChat}
          onOpenSearch={onOpenSearch}
          onOpenSettings={onOpenSettings}
          onToggleCollapse={onToggleCollapse}
          onOpenNewFolder={() => setShowFolderEdit(true)}
          onSelectFolder={setSelectedFolderId}
          onFolderContextMenu={handleFolderContextMenu}
          onSelectConversation={onSelectConversation}
          onRenameConversation={handleRename}
          onDeleteConversation={handleDelete}
          onMoveConversation={setMovingConvId}
          onPinConversation={handlePin}
          onArchiveConversation={handleArchive}
          onShareConversation={handleShare}
          onCloneConversation={handleClone}
          onDownloadConversation={handleDownload}
        />
      )}

      <RenameConversationDialog
        visible={!!renamingId}
        value={renameText}
        onChange={setRenameText}
        onSubmit={submitRename}
        onClose={() => setRenamingId(null)}
      />

      <MoveToFolderDialog
        visible={!!movingConvId}
        folders={folders}
        onSelect={handleFolderSelect}
        onClose={() => setMovingConvId(null)}
      />

      {/* New folder modal */}
      <FolderEditModal visible={showFolderEdit} onClose={() => setShowFolderEdit(false)} />

      {/* Rename folder modal */}
      <FolderEditModal
        key={renamingFolderId ?? "none"}
        visible={!!renamingFolderId}
        onClose={() => setRenamingFolderId(null)}
        folderId={renamingFolderId ?? undefined}
      />

      {folderContextMenu && (
        <FolderContextMenu
          x={folderContextMenu.x}
          y={folderContextMenu.y}
          onRename={() => {
            setRenamingFolderId(folderContextMenu.folderId);
            setFolderContextMenu(null);
          }}
          onDelete={() => {
            handleDeleteFolder(folderContextMenu.folderId);
            setFolderContextMenu(null);
          }}
          onClose={() => setFolderContextMenu(null)}
        />
      )}
    </>
  );
}
