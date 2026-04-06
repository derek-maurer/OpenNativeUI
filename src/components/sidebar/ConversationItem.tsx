import { useRef } from "react";
import { View, Text, Pressable, Alert, StyleSheet, Animated } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { useConversationStore } from "@/stores/conversationStore";
import type { Conversation } from "@/lib/types";

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onPress: () => void;
}

export function ConversationItem({
  conversation,
  isActive,
  onPress,
}: ConversationItemProps) {
  const { dark, colors } = useTheme();
  const removeConversation = useConversationStore((s) => s.removeConversation);
  const renameConversation = useConversationStore((s) => s.renameConversation);
  const swipeableRef = useRef<Swipeable>(null);

  const handleDelete = () => {
    Alert.alert(
      "Delete Conversation",
      "Are you sure you want to delete this conversation?",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => swipeableRef.current?.close(),
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => removeConversation(conversation.id),
        },
      ]
    );
  };

  const handleRename = () => {
    Alert.prompt(
      "Rename Conversation",
      "Enter a new title:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: (newTitle?: string) => {
            if (newTitle?.trim()) {
              renameConversation(conversation.id, newTitle.trim());
            }
          },
        },
      ],
      "plain-text",
      conversation.title
    );
  };

  const handleLongPress = () => {
    Alert.alert(conversation.title, undefined, [
      { text: "Rename", onPress: handleRename },
      { text: "Delete", style: "destructive", onPress: handleDelete },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: "clamp",
    });

    return (
      <Pressable onPress={handleDelete} style={styles.deleteAction}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </Animated.View>
      </Pressable>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      rightThreshold={40}
    >
      <Pressable
        onPress={onPress}
        onLongPress={handleLongPress}
        style={[
          styles.container,
          { backgroundColor: dark ? "#0d0d0d" : "#f9f9f9" },
          isActive && {
            backgroundColor: dark ? "#1a1a1a" : "#e0e0e0",
          },
        ]}
      >
        <Text
          style={[
            styles.title,
            { color: colors.text },
            isActive && { fontWeight: "500" },
          ]}
          numberOfLines={1}
        >
          {conversation.title}
        </Text>
        <Pressable
          onPress={handleLongPress}
          hitSlop={8}
          style={styles.editButton}
        >
          <Ionicons
            name="pencil-outline"
            size={14}
            color={dark ? "#666" : "#999"}
          />
        </Pressable>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginVertical: 1,
  },
  title: {
    fontSize: 14,
    flex: 1,
  },
  editButton: {
    marginLeft: 8,
    padding: 4,
  },
  deleteAction: {
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    width: 72,
    borderRadius: 10,
    marginVertical: 1,
  },
});
