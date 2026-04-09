import { useEffect } from "react";
import {
  useChatStore,
  useModelStore,
  useStreamingChat,
  fetchConversation,
  historyToMessages,
} from "@opennative/shared";
import { Loader2 } from "lucide-react";
import { MessageList } from "../components/chat/MessageList";
import { InputComposer } from "../components/chat/InputComposer";

interface ChatScreenProps {
  conversationId: string;
  isNew?: boolean;
  initialMessage?: string;
}

export function ChatScreen({ conversationId, isNew, initialMessage }: ChatScreenProps) {
  const setConversation = useChatStore((s) => s.setConversation);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const messages = useChatStore((s) => s.messages);
  const selectedModelId = useModelStore((s) => s.selectedModelId);

  const { sendMessage, abort } = useStreamingChat();

  // Load conversation on mount (if not new)
  useEffect(() => {
    if (isNew) {
      setConversation(conversationId, []);
      return;
    }

    let cancelled = false;
    fetchConversation(conversationId)
      .then((serverConv) => {
        if (cancelled) return;
        const msgs = serverConv.chat?.history
          ? historyToMessages(serverConv.chat.history, conversationId)
          : [];
        setConversation(conversationId, msgs);
      })
      .catch(() => {
        if (!cancelled) setConversation(conversationId, []);
      });

    return () => { cancelled = true; };
  }, [conversationId, isNew, setConversation]);

  // Send initial message if provided
  useEffect(() => {
    if (initialMessage && isNew) {
      sendMessage(initialMessage, conversationId, true);
    }
  }, []);

  const handleSend = (content: string) => {
    sendMessage(content, conversationId, messages.length === 0);
  };

  // Show loader while fetching existing conversation
  const isLoading = !isNew && messages.length === 0 && !isStreaming;

  return (
    <div className="flex h-full flex-col">
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 size={24} className="animate-spin text-neutral-500" />
        </div>
      ) : (
        <MessageList onSuggest={handleSend} />
      )}

      <InputComposer
        onSend={handleSend}
        onAbort={abort}
        disabled={!selectedModelId}
      />
    </div>
  );
}
