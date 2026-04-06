import { useMemo } from "react";
import { View, Text, Pressable, FlatList, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";

import { useConversationStore } from "@opennative/shared";
import { useFolderStore } from "@opennative/shared";
import { ConversationItem } from "@/components/sidebar/ConversationItem";
import { useChatStore } from "@opennative/shared";

export default function FolderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, dark } = useTheme();

  const folder = useFolderStore((s) => s.folders.find((f) => f.id === id));
  const conversations = useConversationStore((s) => s.conversations);
  const currentConversationId = useChatStore((s) => s.currentConversationId);

  const folderConversations = useMemo(
    () =>
      conversations
        .filter((c) => c.folderId === id)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations, id]
  );

  const handleSelectConversation = (conversationId: string) => {
    router.push(`/(app)/chat/${conversationId}`);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={{ padding: 6 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Ionicons
            name="folder-outline"
            size={18}
            color={colors.text}
            style={{ marginRight: 8 }}
          />
          <Text
            style={[styles.headerTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {folder?.name ?? "Folder"}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={folderConversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 8 }}
        renderItem={({ item }) => (
          <ConversationItem
            conversation={item}
            isActive={item.id === currentConversationId}
            onPress={() => handleSelectConversation(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="folder-open-outline"
              size={40}
              color={dark ? "#404040" : "#d4d4d4"}
            />
            <Text style={styles.emptyText}>No conversations in this folder</Text>
            <Text style={styles.emptyHint}>
              Long-press a conversation in the sidebar to move it here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    maxWidth: 220,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 80,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#737373",
    marginTop: 8,
  },
  emptyHint: {
    fontSize: 13,
    color: "#525252",
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
