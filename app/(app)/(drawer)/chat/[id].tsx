import { useEffect, useCallback, useRef, useState } from "react";
import { StyleSheet, ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useNavigation, DrawerActions, useTheme } from "@react-navigation/native";

import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageList } from "@/components/chat/MessageList";
import { InputComposer } from "@/components/chat/InputComposer";
import { useChatStore } from "@/stores/chatStore";
import { useModelStore } from "@/stores/modelStore";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import { fetchConversation, historyToMessages } from "@/services/conversationApi";

export default function ChatScreen() {
  const { id, initialMessage, isNew } = useLocalSearchParams<{
    id: string;
    initialMessage?: string;
    isNew?: string;
  }>();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(isNew !== "true");
  // Tracks which chat id we've already processed so the effect is idempotent
  // across dev strict-mode double-invocations and expo-router param updates.
  const processedIdRef = useRef<string | null>(null);

  const setConversation = useChatStore((s) => s.setConversation);
  const messages = useChatStore((s) => s.messages);
  const streamingContent = useChatStore((s) => s.streamingContent);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const streamingStatus = useChatStore((s) => s.streamingStatus);

  const { sendMessage, abort } = useStreamingChat();

  useEffect(() => {
    if (!id || processedIdRef.current === id) return;
    processedIdRef.current = id;

    // Read isNew fresh on every id change — NOT from a ref captured at mount
    // time. Expo Router reuses this component across chat navigations, so a
    // ref initialized once on mount would go stale when the user creates
    // another new chat from the same session.
    const isNewConvo = isNew === "true";

    const loadMessages = async () => {
      if (isNewConvo) {
        // New conversation — start with empty messages and send the initial
        // message with isNew=true so the streaming hook creates the server
        // record before streaming.
        setConversation(id, []);
        setLoading(false);

        if (initialMessage) {
          sendMessage(decodeURIComponent(initialMessage), id, true);
        }
      } else {
        // Existing conversation — load from server
        try {
          const serverConv = await fetchConversation(id);
          const msgs = historyToMessages(serverConv.chat.history, id);
          setConversation(id, msgs);

          // Re-select the model that was used in this conversation
          const convModel = serverConv.chat?.models?.[0];
          if (convModel) {
            useModelStore.getState().setSelectedModel(convModel);
          }
        } catch {
          // If fetch fails (e.g. 404), start empty
          setConversation(id, []);
        } finally {
          setLoading(false);
        }

        if (initialMessage) {
          sendMessage(decodeURIComponent(initialMessage), id, false);
        }
      }
    };

    loadMessages();
  }, [id, isNew, initialMessage, sendMessage, setConversation]);

  const handleSend = useCallback(
    (content: string) => {
      if (!id) return;
      // Prefer the server-assigned id that the streaming hook stashes in the
      // chat store after a new-chat create. The URL param `id` is the
      // client-generated UUID and won't match what the server persisted.
      const storeId = useChatStore.getState().currentConversationId;
      sendMessage(content, storeId ?? id, false);
    },
    [id, sendMessage]
  );

  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <ChatHeader onMenuPress={openDrawer} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#10a37f" />
        </View>
      ) : (
        <>
          <MessageList
            messages={messages}
            streamingContent={streamingContent}
            isStreaming={isStreaming}
            streamingStatus={streamingStatus}
          />

          <InputComposer
            onSend={handleSend}
            isStreaming={isStreaming}
            onStop={abort}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
