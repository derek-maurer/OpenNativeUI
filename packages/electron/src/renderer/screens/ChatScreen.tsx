import { useCallback, useEffect, useRef, useState } from "react";
import {
  useChatStore,
  useModelStore,
  useStreamingChat,
  useSettingsStore,
  fetchConversation,
  historyToMessages,
} from "@opennative/shared";
import { Loader2 } from "lucide-react";
import { MessageList } from "../components/chat/MessageList";
import { InputComposer } from "../components/chat/InputComposer";
import { playChime } from "../lib/chime";
import { useFileUpload } from "../hooks/useFileUpload";

interface ChatScreenProps {
  conversationId: string;
  isNew?: boolean;
  initialMessage?: string;
}

export function ChatScreen({ conversationId, isNew, initialMessage }: ChatScreenProps) {
  const setConversation = useChatStore((s) => s.setConversation);
  const removeMessagesFrom = useChatStore((s) => s.removeMessagesFrom);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const messages = useChatStore((s) => s.messages);
  const selectedModelId = useModelStore((s) => s.selectedModelId);
  const chimeOnComplete = useSettingsStore((s) => s.chimeOnComplete);

  const onComplete = useCallback(() => {
    if (chimeOnComplete) playChime();
  }, [chimeOnComplete]);

  const { sendMessage, abort } = useStreamingChat({ onComplete });
  const { uploadBlob } = useFileUpload();

  const [loading, setLoading] = useState(!isNew);
  const [dragOver, setDragOver] = useState(false);
  const dragCounter = useRef(0);

  // Load conversation on mount (if not new)
  useEffect(() => {
    if (isNew) {
      setConversation(conversationId, []);
      return;
    }

    setLoading(true);
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
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [conversationId, isNew, setConversation]);

  // Send initial message if provided — ref guard prevents StrictMode double-fire
  const initialMessageSent = useRef(false);
  useEffect(() => {
    if (initialMessage && isNew && !initialMessageSent.current) {
      initialMessageSent.current = true;
      sendMessage(initialMessage, conversationId, true);
    }
  }, []);

  const handleSend = (content: string) => {
    sendMessage(content, conversationId, messages.length === 0);
  };

  const handleRetry = useCallback(
    (assistantMessageId: string, userContent: string) => {
      removeMessagesFrom(assistantMessageId);
      const storeId = useChatStore.getState().currentConversationId;
      sendMessage(userContent, storeId ?? conversationId, false);
    },
    [conversationId, removeMessagesFrom, sendMessage],
  );

  // Show loader while fetching existing conversation
  const isLoading = loading;

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (dragCounter.current === 1) setDragOver(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      for (const file of files) {
        uploadBlob(file);
      }
    },
    [uploadBlob]
  );

  return (
    <div
      className="relative flex h-full flex-col"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-primary/10">
          <div className="rounded-xl border-2 border-dashed border-primary px-8 py-6">
            <p className="text-sm font-medium text-primary">
              Drop files to attach
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 size={24} className="animate-spin text-muted" />
        </div>
      ) : (
        <MessageList onSuggest={handleSend} onRetry={handleRetry} />
      )}

      <InputComposer
        onSend={handleSend}
        onAbort={abort}
        disabled={!selectedModelId}
      />
    </div>
  );
}
