import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useTheme } from "@react-navigation/native";

import {
  fetchConversation,
  historyToMessages,
  useChatStore,
  useModelStore,
  useStreamingChat,
} from "@opennative/shared";
import { MessageList } from "@/components/chat/MessageList";
import { InputComposer } from "@/components/chat/InputComposer";
import { ModelPickerOverlay } from "@/components/chat/ModelSelector";
import { ChatOptionsMenu } from "@/components/chat/ChatOptionsMenu";

interface ChatScreenProps {
  conversationId: string;
  isNew: boolean;
  initialMessage?: string;
}

export function ChatScreen({ conversationId, isNew, initialMessage }: ChatScreenProps) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(!isNew);
  const [menuVisible, setMenuVisible] = useState(false);
  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  const processedIdRef = useRef<string | null>(null);
  const isFirstMessageRef = useRef(isNew);

  const setConversation = useChatStore((s) => s.setConversation);
  const messages = useChatStore((s) => s.messages);
  const streamingContent = useChatStore((s) => s.streamingContent);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const streamingStatus = useChatStore((s) => s.streamingStatus);

  const { sendMessage, abort } = useStreamingChat();

  useEffect(() => {
    if (!conversationId || processedIdRef.current === conversationId) return;
    processedIdRef.current = conversationId;

    const loadMessages = async () => {
      if (isNew) {
        setLoading(false);
        if (initialMessage) {
          isFirstMessageRef.current = false;
          sendMessage(decodeURIComponent(initialMessage), conversationId, true);
        }
      } else {
        try {
          const serverConv = await fetchConversation(conversationId);
          const msgs = historyToMessages(serverConv.chat.history, conversationId);
          setConversation(conversationId, msgs);
          const convModel = serverConv.chat?.models?.[0];
          if (convModel) {
            useModelStore.getState().setSelectedModel(convModel);
          }
        } catch {
          setConversation(conversationId, []);
        } finally {
          setLoading(false);
        }
        if (initialMessage) {
          sendMessage(decodeURIComponent(initialMessage), conversationId, false);
        }
      }
    };

    loadMessages();
  }, [conversationId, isNew, initialMessage, sendMessage, setConversation]);

  const handleSend = useCallback(
    (content: string) => {
      const shouldBeNew = isFirstMessageRef.current;
      if (shouldBeNew) isFirstMessageRef.current = false;
      const storeId = useChatStore.getState().currentConversationId;
      sendMessage(content, storeId ?? conversationId, shouldBeNew);
    },
    [conversationId, sendMessage],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
            onOpenMenu={() => setMenuVisible((v) => !v)}
            onOpenModelPicker={() => setModelPickerVisible(true)}
          />
          <ChatOptionsMenu
            visible={menuVisible}
            onClose={() => setMenuVisible(false)}
          />
          <ModelPickerOverlay
            visible={modelPickerVisible}
            onClose={() => setModelPickerVisible(false)}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
});
