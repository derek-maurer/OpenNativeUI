import type { Conversation, Folder as FolderType } from "@opennative/shared";
import { groupConversationsByDate } from "@opennative/shared";
import { ArrowLeft, Folder, FolderOpen, MessageSquare, Pencil, Settings } from "lucide-react";
import { useState } from "react";
import { FolderDataModal } from "../folders/FolderDataModal";
import { Tooltip } from "../ui/Tooltip";
import { ConversationItem } from "./ConversationItem";

interface FolderDetailViewProps {
  folder: FolderType;
  conversations: Conversation[];
  currentConversationId: string | null;
  onBack: () => void;
  onOpenSettings: () => void;
  onSelectConversation: (id: string) => void;
  onRenameConversation: (conv: Conversation) => void;
  onDeleteConversation: (id: string) => void;
  onMoveConversation: (id: string) => void;
}

export function FolderDetailView({
  folder,
  conversations,
  currentConversationId,
  onBack,
  onOpenSettings,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  onMoveConversation,
}: FolderDetailViewProps) {
  const [showFolderData, setShowFolderData] = useState(false);

  const systemPrompt = folder.data?.system_prompt;
  const attachedFiles = folder.data?.files ?? [];
  const folderGroups = groupConversationsByDate(conversations);

  return (
    <div className="flex h-full flex-col bg-sidebar no-select">
      {/* Header */}
      <div className="app-drag flex items-center gap-1 px-3 pt-9 pb-2">
        <Tooltip label="Back">
          <button
            onClick={onBack}
            className="app-no-drag rounded-lg p-1.5 text-muted hover:text-fg hover:bg-hover transition-colors shrink-0"
          >
            <ArrowLeft size={15} />
          </button>
        </Tooltip>
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <Folder size={13} className="shrink-0 text-secondary" />
          <span className="text-xs font-semibold text-fg uppercase tracking-wider truncate select-none">
            {folder.name}
          </span>
        </div>
        <Tooltip label="Edit folder">
          <button
            onClick={() => setShowFolderData(true)}
            className="app-no-drag rounded-lg p-1.5 text-muted hover:text-fg hover:bg-hover transition-colors shrink-0"
          >
            <Pencil size={13} />
          </button>
        </Tooltip>
      </div>

      {/* System prompt / files info card */}
      {(systemPrompt || attachedFiles.length > 0) && (
        <div
          className="mx-2 mb-2 rounded-xl bg-hover border border-line p-3 cursor-pointer hover:bg-hover transition-colors"
          onClick={() => setShowFolderData(true)}
        >
          {systemPrompt && (
            <div className="flex items-start gap-2 mb-2">
              <MessageSquare size={13} className="shrink-0 text-muted mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-0.5">
                  System Prompt
                </p>
                <p className="text-xs text-fg line-clamp-2">{systemPrompt}</p>
              </div>
            </div>
          )}
          {attachedFiles.length > 0 && (
            <div className="flex items-start gap-2">
              <Folder size={13} className="shrink-0 text-muted mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-0.5">
                  {attachedFiles.length} {attachedFiles.length === 1 ? "file" : "files"}
                </p>
                <p className="text-xs text-secondary truncate">
                  {attachedFiles.map((f) => f.name ?? f.id).join(", ")}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conversations in folder */}
      <div className="flex-1 overflow-y-auto px-2">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-12 gap-2 text-center">
            <FolderOpen size={32} className="text-dim" />
            <p className="text-xs text-muted mt-1">No conversations in this folder</p>
            <p className="text-[11px] text-dim">
              Right-click a conversation and choose "Move to Folder"
            </p>
          </div>
        ) : (
          folderGroups.map(({ title, data }) => (
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
                />
              ))}
            </div>
          ))
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

      {/* Edit folder (name + system prompt + files) */}
      <FolderDataModal
        key={folder.id}
        visible={showFolderData}
        onClose={() => setShowFolderData(false)}
        folder={folder}
      />
    </div>
  );
}
