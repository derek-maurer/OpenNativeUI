import { useEffect, useState } from "react";
import {
  useConversationStore,
  useFolderStore,
  useModelStore,
  useChatStore,
  useSettingsStore,
  connectSocket,
  disconnectSocket,
} from "@opennative/shared";
import { Sidebar } from "../components/sidebar/Sidebar";
import { ChatScreen } from "../screens/ChatScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { MessageSquare } from "lucide-react";

type View =
  | { type: "empty" }
  | { type: "chat"; conversationId: string; isNew?: boolean }
  | { type: "settings" };

function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function MainLayout() {
  const [view, setView] = useState<View>(() => {
    const id = generateId();
    return { type: "chat", conversationId: id, isNew: true };
  });
  const loadConversations = useConversationStore((s) => s.loadConversations);
  const reloadFolderMemberships = useConversationStore((s) => s.reloadFolderMemberships);
  const loadFolders = useFolderStore((s) => s.loadFolders);
  const fetchModels = useModelStore((s) => s.fetchModels);
  const setSelectedModel = useModelStore((s) => s.setSelectedModel);
  const defaultModelId = useModelStore((s) => s.defaultModelId);
  const models = useModelStore((s) => s.models);
  const clearChat = useChatStore((s) => s.clearChat);
  const webSearchByDefault = useSettingsStore((s) => s.webSearchByDefault);
  const toggleWebSearch = useChatStore((s) => s.toggleWebSearch);
  const webSearchEnabled = useChatStore((s) => s.webSearchEnabled);

  // Boot: load data and connect socket
  useEffect(() => {
    loadConversations();
    loadFolders().then(() => reloadFolderMemberships());
    fetchModels();
    connectSocket();
    return () => { disconnectSocket(); };
  }, []);

  // Apply web search default on mount
  useEffect(() => {
    if (webSearchByDefault && !webSearchEnabled) {
      toggleWebSearch();
    }
  }, []);

  // Auto-select default model when models load
  useEffect(() => {
    if (models.length > 0 && defaultModelId) {
      const hasDefault = models.some((m) => m.id === defaultModelId);
      if (hasDefault) setSelectedModel(defaultModelId);
    }
  }, [models.length]);

  const handleNewChat = () => {
    clearChat();
    // Re-apply defaults for new conversation (clearChat resets webSearchEnabled to false)
    if (webSearchByDefault) {
      toggleWebSearch();
    }
    if (defaultModelId && models.some((m) => m.id === defaultModelId)) {
      setSelectedModel(defaultModelId);
    }
    const id = generateId();
    setView({ type: "chat", conversationId: id, isNew: true });
  };

  const handleSelectConversation = (id: string) => {
    setView({ type: "chat", conversationId: id, isNew: false });
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0d0d0d]">
      {/* Sidebar */}
      <div className="w-[260px] shrink-0 border-r border-neutral-800">
        <Sidebar
          onNewChat={handleNewChat}
          onSelectConversation={handleSelectConversation}
          onOpenSettings={() => setView({ type: "settings" })}
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Drag strip matching the sidebar's titlebar height on the content side */}
        {view.type !== "settings" && (
          <div className="app-drag h-9 shrink-0" />
        )}

        {view.type === "empty" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-neutral-600">
            <MessageSquare size={40} strokeWidth={1} />
            <p className="text-sm">Select a conversation or start a new chat</p>
          </div>
        )}

        {view.type === "chat" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <ChatScreen
              key={view.conversationId}
              conversationId={view.conversationId}
              isNew={view.isNew}
            />
          </div>
        )}

        {view.type === "settings" && (
          <SettingsScreen onClose={() => setView({ type: "empty" })} />
        )}
      </div>
    </div>
  );
}
