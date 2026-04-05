import { useRef, useEffect } from "react";
import { FlatList, View } from "react-native";
import type { Message } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

interface MessageListProps {
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
}

export function MessageList({
  messages,
  streamingContent,
  isStreaming,
}: MessageListProps) {
  const flatListRef = useRef<FlatList>(null);

  const displayData: Array<Message | { id: string; type: "streaming" }> = [
    ...messages,
  ];

  if (isStreaming) {
    displayData.push({ id: "__streaming__", type: "streaming" });
  }

  useEffect(() => {
    if (displayData.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, streamingContent.length > 0]);

  const renderItem = ({
    item,
  }: {
    item: Message | { id: string; type: "streaming" };
  }) => {
    if ("type" in item && item.type === "streaming") {
      if (streamingContent) {
        return (
          <MessageBubble
            role="assistant"
            content={streamingContent}
            isStreaming
          />
        );
      }
      return <TypingIndicator />;
    }

    const message = item as Message;
    return <MessageBubble role={message.role} content={message.content} />;
  };

  return (
    <FlatList
      ref={flatListRef}
      data={displayData}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: 16, paddingTop: 8 }}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={<View />}
    />
  );
}
