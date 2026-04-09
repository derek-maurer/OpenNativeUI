import { useCallback, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useNavigation, DrawerActions, useTheme, useFocusEffect } from "@react-navigation/native";
import * as Crypto from "expo-crypto";

import { ChatHeader } from "@/components/chat/ChatHeader";
import { InputComposer } from "@/components/chat/InputComposer";
import { EmptyState } from "@/components/chat/EmptyState";
import { useChatStore } from "@opennative/shared";
import { useModelStore } from "@opennative/shared";
import { useSettingsStore } from "@opennative/shared";

export default function NewChatScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { colors } = useTheme(); // used by SafeAreaView background
  const clearChat = useChatStore((s) => s.clearChat);
  const isCreating = useRef(false);

  // Apply default model every time the new chat screen is focused
  useFocusEffect(
    useCallback(() => {
      const { defaultModelId, models, setSelectedModel } = useModelStore.getState();
      if (defaultModelId && models.some((m) => m.id === defaultModelId)) {
        setSelectedModel(defaultModelId);
      }
      // Sync the chat's web-search option to the "web search by default"
      // preference. The new-chat screen is a fresh slate, so its options
      // should always reflect the current default — not whatever lingered
      // from a previous chat that was navigated away from.
      const { webSearchByDefault } = useSettingsStore.getState();
      const { webSearchEnabled, toggleWebSearch } = useChatStore.getState();
      if (webSearchByDefault !== webSearchEnabled) {
        toggleWebSearch();
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
        <EmptyState onSuggest={handleSend} />
      </View>

      <InputComposer onSend={handleSend} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyState: { flex: 1 },
});
