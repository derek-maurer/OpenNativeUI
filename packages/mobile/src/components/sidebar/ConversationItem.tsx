import { useRef, useState } from "react";
import { View, Text, Pressable, Alert, StyleSheet, Animated, Share } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { useConversationStore, useAuthStore, fetchConversation } from "@opennative/shared";
import { FolderPickerSheet } from "@/components/folders/FolderPickerSheet";
import { ConversationActionsSheet } from "./ConversationActionsSheet";
import type { Conversation } from "@opennative/shared";
import { File, Paths } from "expo-file-system";

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
  const moveConversationToFolder = useConversationStore(
    (s) => s.moveConversationToFolder,
  );
  const pinConv = useConversationStore((s) => s.pinConversation);
  const archiveConv = useConversationStore((s) => s.archiveConversation);
  const shareConv = useConversationStore((s) => s.shareConversation);
  const cloneConv = useConversationStore((s) => s.cloneConversation);
  const serverUrl = useAuthStore((s) => s.serverUrl);
  const swipeableRef = useRef<Swipeable>(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [folderPickerVisible, setFolderPickerVisible] = useState(false);

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

  const handlePin = async () => {
    try {
      await pinConv(conversation.id, !conversation.pinned);
    } catch (e) {
      Alert.alert("Error", "Failed to pin conversation");
    }
  };

  const handleArchive = () => {
    Alert.alert(
      "Archive Conversation",
      "Are you sure you want to archive this conversation?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          onPress: async () => {
            try {
              await archiveConv(conversation.id);
            } catch (e) {
              Alert.alert("Error", "Failed to archive conversation");
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    try {
      const shareId = await shareConv(conversation.id);
      const shareUrl = `${serverUrl.replace(/\/+$/, "")}/s/${shareId}`;
      await Share.share({ url: shareUrl, message: shareUrl });
    } catch (e) {
      Alert.alert("Error", "Failed to share conversation");
    }
  };

  const handleClone = async () => {
    try {
      await cloneConv(conversation.id);
    } catch (e) {
      Alert.alert("Error", "Failed to clone conversation");
    }
  };

  const handleDownload = async () => {
    try {
      const serverConv = await fetchConversation(conversation.id);
      const json = JSON.stringify(serverConv, null, 2);
      const fileName = `${(conversation.title || "chat").replace(/[/\\?%*:|"<>]/g, "_")}.json`;
      const file = new File(Paths.cache, fileName);
      if (!file.exists) {
        file.create();
      }
      file.write(json);
      await Share.share({ url: file.uri, title: fileName });
    } catch (e) {
      Alert.alert("Error", "Failed to export conversation");
    }
  };

  const handleLongPress = () => {
    setActionsVisible(true);
  };

  const handleFolderSelect = async (folderId: string | null) => {
    try {
      await moveConversationToFolder(conversation.id, folderId);
    } catch (e) {
      console.error("[sidebar] folder move failed", {
        conversationId: conversation.id,
        folderId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
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
    <>
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

      <ConversationActionsSheet
        visible={actionsVisible}
        conversation={conversation}
        onClose={() => setActionsVisible(false)}
        onShare={handleShare}
        onDownload={handleDownload}
        onRename={handleRename}
        onPin={handlePin}
        onClone={handleClone}
        onMoveToFolder={() => setFolderPickerVisible(true)}
        onArchive={handleArchive}
        onDelete={handleDelete}
      />

      <FolderPickerSheet
        visible={folderPickerVisible}
        onClose={() => setFolderPickerVisible(false)}
        currentFolderId={conversation.folderId ?? null}
        onSelect={handleFolderSelect}
      />
    </>
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
