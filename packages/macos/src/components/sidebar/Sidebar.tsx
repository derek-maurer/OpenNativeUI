import { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";

import {
  useChatStore,
  useConversationStore,
  useFolderStore,
  type Conversation,
} from "@opennative/shared";
import { ModelSelector } from "@/components/chat/ModelSelector";

interface SidebarProps {
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onSettings: () => void;
}

function groupByDate(conversations: Conversation[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  const yesterdayMs = todayMs - 86400000;
  const weekAgoMs = todayMs - 7 * 86400000;

  const todayItems: Conversation[] = [];
  const yesterdayItems: Conversation[] = [];
  const weekItems: Conversation[] = [];
  const olderItems: Conversation[] = [];

  for (const conv of conversations) {
    if (conv.updatedAt >= todayMs) todayItems.push(conv);
    else if (conv.updatedAt >= yesterdayMs) yesterdayItems.push(conv);
    else if (conv.updatedAt >= weekAgoMs) weekItems.push(conv);
    else olderItems.push(conv);
  }

  const groups: { title: string; data: Conversation[] }[] = [];
  if (todayItems.length) groups.push({ title: "Today", data: todayItems });
  if (yesterdayItems.length) groups.push({ title: "Yesterday", data: yesterdayItems });
  if (weekItems.length) groups.push({ title: "Previous 7 Days", data: weekItems });
  if (olderItems.length) groups.push({ title: "Older", data: olderItems });
  return groups;
}

type Row =
  | { type: "dateHeader"; title: string; id: string }
  | { type: "item"; conversation: Conversation; id: string };

export function Sidebar({
  selectedConversationId,
  onSelectConversation,
  onNewChat,
  onSettings,
}: SidebarProps) {
  const { colors, dark } = useTheme();
  const conversations = useConversationStore((s) => s.conversations);
  const isLoading = useConversationStore((s) => s.isLoading);
  const loadConversations = useConversationStore((s) => s.loadConversations);
  const reloadFolderMemberships = useConversationStore((s) => s.reloadFolderMemberships);
  const loadFolders = useFolderStore((s) => s.loadFolders);
  const removeConversation = useConversationStore((s) => s.removeConversation);
  const renameConversation = useConversationStore((s) => s.renameConversation);

  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Conversation | null>(null);
  const [renameText, setRenameText] = useState("");

  const flatData: Row[] = [];
  const dateGroups = groupByDate(conversations);
  for (const group of dateGroups) {
    flatData.push({ type: "dateHeader", title: group.title, id: `date-${group.title}` });
    for (const conv of group.data) {
      flatData.push({ type: "item", conversation: conv, id: conv.id });
    }
  }

  const handleRefresh = async () => {
    await Promise.all([loadConversations(), loadFolders()]);
    await reloadFolderMemberships();
  };

  const handleLongPress = (conversation: Conversation) => {
    Alert.alert(conversation.title, undefined, [
      {
        text: "Rename",
        onPress: () => {
          setRenameTarget(conversation);
          setRenameText(conversation.title);
          setRenameModalVisible(true);
        },
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Delete Conversation",
            "Are you sure?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => removeConversation(conversation.id),
              },
            ],
          );
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleRenameConfirm = () => {
    if (renameTarget && renameText.trim()) {
      renameConversation(renameTarget.id, renameText.trim());
    }
    setRenameModalVisible(false);
    setRenameTarget(null);
  };

  const subText = dark ? "#a3a3a3" : "#525252";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.card }]}
      edges={["top", "bottom"]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <ModelSelector />
        <Pressable
          onPress={onNewChat}
          style={[styles.iconButton, { backgroundColor: dark ? "#2a2a2a" : "#e5e5e5" }]}
          accessibilityLabel="New chat"
        >
          <Text style={[styles.iconButtonText, { color: colors.text }]}>✏</Text>
        </Pressable>
      </View>

      {/* Conversation list */}
      <FlatList
        data={flatData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 6, paddingVertical: 6 }}
        refreshing={isLoading}
        onRefresh={handleRefresh}
        renderItem={({ item }) => {
          if (item.type === "dateHeader") {
            return <Text style={styles.sectionHeader}>{item.title}</Text>;
          }
          const { conversation } = item;
          const isActive = conversation.id === selectedConversationId;
          return (
            <Pressable
              onPress={() => onSelectConversation(conversation.id)}
              onLongPress={() => handleLongPress(conversation)}
              style={[
                styles.row,
                { backgroundColor: dark ? "#0d0d0d" : "#f9f9f9" },
                isActive && { backgroundColor: dark ? "#1e1e1e" : "#e0e0e0" },
              ]}
            >
              <Text
                style={[
                  styles.rowTitle,
                  { color: colors.text },
                  isActive && { fontWeight: "500" },
                ]}
                numberOfLines={1}
              >
                {conversation.title}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Text style={{ color: "#737373", fontSize: 13 }}>No conversations yet</Text>
          </View>
        }
      />

      {/* Settings button */}
      <Pressable
        onPress={onSettings}
        style={[styles.settingsRow, { borderTopColor: colors.border }]}
      >
        <Text style={styles.settingsIcon}>⚙</Text>
        <Text style={[styles.settingsText, { color: colors.text }]}>Settings</Text>
      </Pressable>

      {/* Rename overlay */}
      {renameModalVisible && (
        <Pressable
          style={[StyleSheet.absoluteFillObject, styles.overlay, { backgroundColor: dark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.4)" }]}
          onPress={() => setRenameModalVisible(false)}
        >
          <Pressable
            style={[styles.renameSheet, { backgroundColor: dark ? "#1a1a1a" : "#fff" }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.renameTitle, { color: colors.text }]}>Rename Conversation</Text>
            <TextInput
              style={[styles.renameInput, { color: colors.text, borderColor: colors.border, backgroundColor: dark ? "#0d0d0d" : "#f5f5f5" }]}
              value={renameText}
              onChangeText={setRenameText}
              autoFocus
              onSubmitEditing={handleRenameConfirm}
            />
            <View style={styles.renameButtons}>
              <Pressable
                onPress={() => setRenameModalVisible(false)}
                style={[styles.renameBtn, { backgroundColor: dark ? "#2a2a2a" : "#e5e5e5" }]}
              >
                <Text style={{ color: colors.text, fontWeight: "500" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleRenameConfirm}
                style={[styles.renameBtn, { backgroundColor: "#10a37f" }]}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonText: { fontSize: 15 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "600",
    color: "#737373",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingTop: 14,
    paddingBottom: 4,
  },
  row: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
    marginVertical: 1,
  },
  rowTitle: { fontSize: 13 },
  emptyList: { paddingHorizontal: 12, paddingVertical: 32, alignItems: "center" },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  settingsIcon: { fontSize: 16, color: "#737373" },
  settingsText: { fontSize: 14 },
  overlay: { flex: 1, alignItems: "center", justifyContent: "center" },
  renameSheet: {
    width: 360,
    borderRadius: 12,
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  renameTitle: { fontSize: 16, fontWeight: "600" },
  renameInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  renameButtons: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  renameBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
