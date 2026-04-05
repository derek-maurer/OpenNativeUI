import { useEffect, useCallback, useRef } from "react";
import { StyleSheet } from "react-native";
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
  const isNewConversation = useRef(isNew === "true");

  const setConversation = useChatStore((s) => s.setConversation);
  const messages = useChatStore((s) => s.messages);
  const streamingContent = useChatStore((s) => s.streamingContent);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const streamingStatus = useChatStore((s) => s.streamingStatus);

  const { sendMessage, abort } = useStreamingChat();

  useEffect(() => {
    if (!id) return;

    const loadMessages = async () => {
      if (isNewConversation.current) {
        // New conversation — start with empty messages
        setConversation(id, []);

        if (initialMessage) {
          sendMessage(decodeURIComponent(initialMessage), id, true);
          isNewConversation.current = false;
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
        }

        if (initialMessage) {
          sendMessage(decodeURIComponent(initialMessage), id, false);
        }
      }
    };

    loadMessages();
  }, [id]);

  const handleSend = useCallback(
    (content: string) => {
      if (!id) return;
      sendMessage(content, id, false);
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
