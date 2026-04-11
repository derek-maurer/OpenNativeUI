import { ChevronRight, Folder, Search, Settings, SquarePen } from "lucide-react";
import { Tooltip } from "../ui/Tooltip";

interface CollapsedSidebarProps {
  onToggleCollapse: () => void;
  onNewChat: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onToggleFolders: () => void;
}

export function CollapsedSidebar({
  onToggleCollapse,
  onNewChat,
  onOpenSearch,
  onOpenSettings,
  onToggleFolders,
}: CollapsedSidebarProps) {
  return (
    <div className="flex h-full flex-col items-center bg-sidebar no-select">
      {/* Expand button */}
      <div className="app-drag flex w-full items-center justify-center pt-9 pb-2">
        <Tooltip label="Expand sidebar" side="right">
          <button
            onClick={onToggleCollapse}
            className="app-no-drag rounded-lg p-1.5 text-muted hover:text-fg hover:bg-hover transition-colors"
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
            className="rounded-lg p-2 text-muted hover:text-fg hover:bg-hover transition-colors"
          >
            <SquarePen size={16} />
          </button>
        </Tooltip>
        <Tooltip label="Search" shortcut="⌘K" side="right">
          <button
            onClick={onOpenSearch}
            className="rounded-lg p-2 text-muted hover:text-fg hover:bg-hover transition-colors"
          >
            <Search size={16} />
          </button>
        </Tooltip>
        <Tooltip label="Folders" side="right">
          <button
            onClick={onToggleFolders}
            className="rounded-lg p-2 text-muted hover:text-fg hover:bg-hover transition-colors"
          >
            <Folder size={16} />
          </button>
        </Tooltip>
      </div>

      {/* Settings */}
      <div className="mt-auto w-full flex items-center justify-center border-t border-line py-3">
        <Tooltip label="Settings" shortcut="⌘," side="right">
          <button
            onClick={onOpenSettings}
            className="rounded-lg p-2 text-muted hover:text-fg hover:bg-hover transition-colors"
          >
            <Settings size={16} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
