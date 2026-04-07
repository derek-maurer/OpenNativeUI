import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";

import {
  connectSocket,
  disconnectSocket,
  useChatStore,
  useConversationStore,
  useFolderStore,
  useModelStore,
  useSettingsStore,
} from "@opennative/shared";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChatScreen } from "@/screens/ChatScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";

type CurrentView =
  | { type: "empty" }
  | { type: "chat"; id: string; isNew: boolean };

export function MainLayout() {
  const { colors } = useTheme();

  const loadConversations = useConversationStore((s) => s.loadConversations);
  const reloadFolderMemberships = useConversationStore(
    (s) => s.reloadFolderMemberships,
  );
  const loadFolders = useFolderStore((s) => s.loadFolders);
  const fetchModels = useModelStore((s) => s.fetchModels);

  const [currentView, setCurrentView] = useState<CurrentView>({ type: "empty" });
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    (async () => {
      await Promise.all([loadConversations(), loadFolders()]);
      await reloadFolderMemberships();
    })();
    fetchModels();
    connectSocket();

    return () => {
      disconnectSocket();
    };
  }, []);

  // Apply default model on startup
  useEffect(() => {
    const { defaultModelId, models, setSelectedModel } =
      useModelStore.getState();
    if (defaultModelId && models.some((m) => m.id === defaultModelId)) {
      setSelectedModel(defaultModelId);
    }
  }, []);

  const handleNewChat = useCallback(() => {
    useChatStore.getState().clearChat();
    // Apply web search default
    const { webSearchByDefault } = useSettingsStore.getState();
    const { webSearchEnabled, toggleWebSearch } = useChatStore.getState();
    if (webSearchByDefault !== webSearchEnabled) toggleWebSearch();
    // Apply default model
    const { defaultModelId, models, setSelectedModel } = useModelStore.getState();
    if (defaultModelId && models.some((m) => m.id === defaultModelId)) {
      setSelectedModel(defaultModelId);
    }
    const uuid = crypto.randomUUID();
    // Initialize the conversation synchronously BEFORE ChatScreen mounts so
    // there is no window where the user can send a message before setConversation
    // runs inside ChatScreen's useEffect (which would wipe the message).
    useChatStore.getState().setConversation(uuid, []);
    setCurrentView({ type: "chat", id: uuid, isNew: true });
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    useChatStore.getState().clearChat();
    setCurrentView({ type: "chat", id, isNew: false });
  }, []);

  const selectedId =
    currentView.type === "chat" ? currentView.id : null;

  return (
    <View style={styles.root}>
      {/* Fixed sidebar */}
      <View style={[styles.sidebarWrapper, { borderRightColor: colors.border }]}>
        <Sidebar
          selectedConversationId={selectedId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onSettings={() => setShowSettings(true)}
        />
      </View>

      {/* Content area */}
      <View style={styles.content}>
        {currentView.type === "empty" && (
          <EmptyState onNewChat={handleNewChat} colors={colors} />
        )}
        {currentView.type === "chat" && (
          <ChatScreen
            key={currentView.id}
            conversationId={currentView.id}
            isNew={currentView.isNew}
          />
        )}
      </View>

      {/* Settings overlay — Modal native component not supported on macOS Fabric */}
      {showSettings && (
        <View style={StyleSheet.absoluteFillObject}>
          <SettingsScreen onClose={() => setShowSettings(false)} />
        </View>
      )}
    </View>
  );
}

function EmptyState({
  onNewChat,
  colors,
}: {
  onNewChat: () => void;
  colors: any;
}) {
  return (
    <View style={emptyStyles.container}>
      <View style={emptyStyles.iconWrap}>
        <Text style={emptyStyles.icon}>💬</Text>
      </View>
      <Text style={[emptyStyles.title, { color: colors.text }]}>
        How can I help you today?
      </Text>
      <Text style={emptyStyles.subtitle}>
        Select a conversation or start a new one
      </Text>
      <Pressable onPress={onNewChat} style={emptyStyles.button}>
        <Text style={emptyStyles.buttonText}>New Chat</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row" },
  sidebarWrapper: {
    width: 260,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  content: { flex: 1 },
});

const emptyStyles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(16,163,127,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  icon: { fontSize: 28 },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#737373", textAlign: "center", marginBottom: 24 },
  button: {
    backgroundColor: "#10a37f",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
