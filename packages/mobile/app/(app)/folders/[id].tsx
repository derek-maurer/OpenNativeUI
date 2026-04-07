import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";

import {
  useConversationStore,
  useFolderStore,
  useChatStore,
} from "@opennative/shared";
import { ConversationItem } from "@/components/sidebar/ConversationItem";
import { FolderEditSheet } from "@/components/folders/FolderEditSheet";

export default function FolderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, dark } = useTheme();

  const folder = useFolderStore((s) => s.folders.find((f) => f.id === id));
  const loadFolder = useFolderStore((s) => s.loadFolder);
  const conversations = useConversationStore((s) => s.conversations);
  const currentConversationId = useChatStore((s) => s.currentConversationId);

  const [editVisible, setEditVisible] = useState(false);

  // Hydrate the folder's `data` blob (system_prompt + files) on mount,
  // since the folders list endpoint omits it.
  useEffect(() => {
    if (id) {
      loadFolder(id);
    }
  }, [id, loadFolder]);

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

  const systemPrompt = folder?.data?.system_prompt;
  const attachedFiles = folder?.data?.files ?? [];

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
        <Pressable
          onPress={() => setEditVisible(true)}
          style={{ padding: 6 }}
          hitSlop={8}
          disabled={!folder}
        >
          <Ionicons
            name="pencil-outline"
            size={22}
            color={folder ? colors.text : "#525252"}
          />
        </Pressable>
      </View>

      <FlatList
        data={folderConversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 8 }}
        ListHeaderComponent={
          systemPrompt || attachedFiles.length > 0 ? (
            <Pressable
              onPress={() => setEditVisible(true)}
              style={[
                styles.settingsCard,
                { backgroundColor: dark ? "#141414" : "#f5f5f5" },
              ]}
            >
              {systemPrompt ? (
                <View style={styles.settingsRow}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={16}
                    color="#737373"
                    style={{ marginRight: 8, marginTop: 2 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingsLabel}>System Prompt</Text>
                    <Text
                      style={[styles.settingsValue, { color: colors.text }]}
                      numberOfLines={3}
                    >
                      {systemPrompt}
                    </Text>
                  </View>
                </View>
              ) : null}
              {attachedFiles.length > 0 ? (
                <View
                  style={[
                    styles.settingsRow,
                    systemPrompt ? { marginTop: 12 } : null,
                  ]}
                >
                  <Ionicons
                    name="attach-outline"
                    size={16}
                    color="#737373"
                    style={{ marginRight: 8, marginTop: 2 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingsLabel}>
                      {attachedFiles.length}{" "}
                      {attachedFiles.length === 1 ? "file" : "files"}
                    </Text>
                    <Text
                      style={[styles.settingsValue, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {attachedFiles
                        .map((f) => f.name ?? f.id)
                        .join(", ")}
                    </Text>
                  </View>
                </View>
              ) : null}
            </Pressable>
          ) : null
        }
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

      <FolderEditSheet
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        folder={folder}
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
  settingsCard: {
    marginHorizontal: 4,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  settingsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#737373",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  settingsValue: {
    fontSize: 14,
    lineHeight: 20,
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
