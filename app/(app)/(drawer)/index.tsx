import { useCallback, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useNavigation, DrawerActions, useTheme, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";

import { ChatHeader } from "@/components/chat/ChatHeader";
import { InputComposer } from "@/components/chat/InputComposer";
import { useChatStore } from "@/stores/chatStore";
import { useModelStore } from "@/stores/modelStore";

export default function NewChatScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const clearChat = useChatStore((s) => s.clearChat);
  const isCreating = useRef(false);

  // Apply default model every time the new chat screen is focused
  useFocusEffect(
    useCallback(() => {
      const { defaultModelId, models, setSelectedModel } = useModelStore.getState();
      if (defaultModelId && models.some((m) => m.id === defaultModelId)) {
        setSelectedModel(defaultModelId);
      }
    }, [])
  );

  const handleSend = useCallback(
    async (content: string) => {
      if (isCreating.current) return;
      isCreating.current = true;

      try {
        const conversationId = Crypto.randomUUID();
        // Capture transient state before clearing
        const {
          webSearchEnabled: wasWebSearchEnabled,
          pendingFiles: savedFiles,
          pendingFolderId: savedFolderId,
        } = useChatStore.getState();
        clearChat();
        // Restore transient state so the chat screen can use it
        if (wasWebSearchEnabled) {
          useChatStore.getState().toggleWebSearch();
        }
        for (const file of savedFiles) {
          useChatStore.getState().addPendingFile(file);
        }
        if (savedFolderId) {
          useChatStore.getState().setPendingFolderId(savedFolderId);
        }

        router.replace(
          `/(app)/chat/${conversationId}?initialMessage=${encodeURIComponent(content)}&isNew=true`
        );
      } finally {
        isCreating.current = false;
      }
    },
    []
  );

  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <ChatHeader onMenuPress={openDrawer} />

      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons name="chatbubble-ellipses" size={28} color="#10a37f" />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          How can I help you today?
        </Text>
        <Text style={styles.emptySubtitle}>
          Start a conversation with any model{"\n"}available on your Open WebUI
          server
        </Text>
      </View>

      <InputComposer onSend={handleSend} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(16, 163, 127, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#737373",
    textAlign: "center",
    lineHeight: 20,
  },
});
