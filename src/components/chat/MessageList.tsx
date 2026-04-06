import { useRef, useEffect, useState, useCallback } from "react";
import {
  FlatList,
  View,
  Pressable,
  StyleSheet,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import type { Message, StreamingStatus } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

interface MessageListProps {
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  streamingStatus?: StreamingStatus | null;
}

const BOTTOM_THRESHOLD = 60;

export function MessageList({
  messages,
  streamingContent,
  isStreaming,
  streamingStatus,
}: MessageListProps) {
  const flatListRef = useRef<FlatList>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const { dark } = useTheme();

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

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        e.nativeEvent;
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      setIsAtBottom(distanceFromBottom <= BOTTOM_THRESHOLD);
    },
    []
  );

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

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
      return <TypingIndicator statusDescription={streamingStatus?.description} />;
    }

    const message = item as Message;
    return (
      <MessageBubble
        role={message.role}
        content={message.content}
        info={message.info}
        files={message.files}
      />
    );
  };

  return (
    <View style={styles.wrapper}>
      <FlatList
        ref={flatListRef}
        data={displayData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 16, paddingTop: 8, flexGrow: 1 }}
        keyboardDismissMode="on-drag"
        alwaysBounceVertical
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<View />}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />
      {!isAtBottom && (
        <Pressable
          onPress={scrollToBottom}
          style={[
            styles.scrollButton,
            {
              backgroundColor: dark ? "#2a2a2a" : "#e5e5e5",
            },
          ]}
        >
          <Ionicons
            name="chevron-down"
            size={20}
            color={dark ? "#fff" : "#000"}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  scrollButton: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
});
