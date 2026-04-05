import { View, Text, Pressable, Alert, StyleSheet } from "react-native";
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

  const handleDelete = () => {
    Alert.alert(
      "Delete Conversation",
      "Are you sure you want to delete this conversation?",
      [
        { text: "Cancel", style: "cancel" },
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

  return (
    <Pressable
      onPress={onPress}
      onLongPress={handleLongPress}
      style={[
        styles.container,
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginVertical: 1,
  },
  title: {
    fontSize: 14,
  },
});
