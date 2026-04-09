import { useRef } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  PanResponder,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";

import { useConversationStore } from "@opennative/shared";
import { useChatStore } from "@opennative/shared";
import { useFolderStore } from "@opennative/shared";
import { ConversationItem } from "./ConversationItem";
import type { Conversation, Folder } from "@opennative/shared";
import { useSidebarStore } from "@/stores/sidebarStore";

const MAX_RECENT_FOLDERS = 3;

function groupByDate(conversations: Conversation[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  const yesterdayMs = todayMs - 86400000;
  const weekAgoMs = todayMs - 7 * 86400000;

  const groups: { title: string; data: Conversation[] }[] = [];
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

  if (todayItems.length) groups.push({ title: "Today", data: todayItems });
  if (yesterdayItems.length)
    groups.push({ title: "Yesterday", data: yesterdayItems });
  if (weekItems.length)
    groups.push({ title: "Previous 7 Days", data: weekItems });
  if (olderItems.length) groups.push({ title: "Older", data: olderItems });

  return groups;
}

/**
 * Rank folders by most recent activity — the max `updatedAt` across
 * conversations in the folder. Folders with no conversations fall back
 * to their own server-side `updated_at`. Returns top N.
 */
function getRecentFolders(
  folders: Folder[],
  conversations: Conversation[],
  limit: number
): Array<{ folder: Folder; count: number }> {
  const stats = new Map<string, { count: number; lastActivity: number }>();

  for (const folder of folders) {
    stats.set(folder.id, {
      count: 0,
      lastActivity: (folder.updated_at ?? 0) * 1000,
    });
  }

  for (const conv of conversations) {
    if (!conv.folderId) continue;
    const entry = stats.get(conv.folderId);
    if (!entry) continue;
    entry.count += 1;
    if (conv.updatedAt > entry.lastActivity) {
      entry.lastActivity = conv.updatedAt;
    }
  }

  return folders
    .map((folder) => ({
      folder,
      count: stats.get(folder.id)?.count ?? 0,
      lastActivity: stats.get(folder.id)?.lastActivity ?? 0,
    }))
    .sort((a, b) => b.lastActivity - a.lastActivity)
    .slice(0, limit)
    .map(({ folder, count }) => ({ folder, count }));
}

type Row =
  | { type: "foldersButton"; id: string }
  | { type: "folderTile"; folder: Folder; count: number; id: string }
  | { type: "dateHeader"; title: string; id: string }
  | { type: "item"; conversation: Conversation; id: string };

export function ConversationList(props: DrawerContentComponentProps) {
  const router = useRouter();
  const { colors, dark } = useTheme();
  const conversations = useConversationStore((s) => s.conversations);
  const isLoading = useConversationStore((s) => s.isLoading);
  const loadConversations = useConversationStore((s) => s.loadConversations);
  const reloadFolderMemberships = useConversationStore(
    (s) => s.reloadFolderMemberships
  );
  const folders = useFolderStore((s) => s.folders);
  const loadFolders = useFolderStore((s) => s.loadFolders);
  const currentConversationId = useChatStore((s) => s.currentConversationId);
  const clearChat = useChatStore((s) => s.clearChat);

  const isCollapsed = useSidebarStore((s) => s.isCollapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);

  const isDesktop = Platform.OS === "web";

  // Resize handle — PanResponder tracks horizontal drag to update drawer width.
  const dragStartWidth = useRef(0);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartWidth.current = useSidebarStore.getState().drawerWidth;
      },
      onPanResponderMove: (_e, g) => {
        useSidebarStore.getState().setDrawerWidth(dragStartWidth.current + g.dx);
      },
    })
  ).current;

  const recentFolders = getRecentFolders(
    folders,
    conversations,
    MAX_RECENT_FOLDERS
  );

  const flatData: Row[] = [];

  flatData.push({ type: "foldersButton", id: "folders-button" });
  for (const { folder, count } of recentFolders) {
    flatData.push({
      type: "folderTile",
      folder,
      count,
      id: `folder-${folder.id}`,
    });
  }

  const dateGroups = groupByDate(conversations);
  for (const group of dateGroups) {
    flatData.push({
      type: "dateHeader",
      title: group.title,
      id: `date-${group.title}`,
    });
    for (const conv of group.data) {
      flatData.push({ type: "item", conversation: conv, id: conv.id });
    }
  }

  const handleNewChat = () => {
    clearChat();
    router.replace("/(app)");
    props.navigation.closeDrawer();
  };

  const handleSelectConversation = (id: string) => {
    router.push(`/(app)/chat/${id}`);
    props.navigation.closeDrawer();
  };

  const handleOpenFolders = () => {
    router.push("/(app)/folders");
    props.navigation.closeDrawer();
  };

  const handleOpenFolder = (folder: Folder) => {
    router.push(`/(app)/folders/${folder.id}`);
    props.navigation.closeDrawer();
  };

  const handleRefresh = async () => {
    await Promise.all([loadConversations(), loadFolders()]);
    await reloadFolderMemberships();
  };

  const handleSettings = () => {
    router.push("/(app)/settings");
    props.navigation.closeDrawer();
  };

  const tileBg = dark ? "#141414" : "#f0f0f0";
  const subText = dark ? "#a3a3a3" : "#525252";
  const bgColor = dark ? "#0d0d0d" : "#f9f9f9";
  const iconBtnBg = dark ? "#2a2a2a" : "#e5e5e5";

  // ── Collapsed (icon-only) mode ──────────────────────────────────────────────
  if (isCollapsed) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: bgColor }]}
        edges={["top", "bottom"]}
      >
        {/* Expand button */}
        <View style={[styles.collapsedHeader, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={toggleCollapsed}
            style={[styles.iconButton, { backgroundColor: iconBtnBg }]}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </Pressable>
        </View>

        {/* Action icons */}
        <View style={styles.collapsedBody}>
          <Pressable
            onPress={handleNewChat}
            style={[styles.iconButton, { backgroundColor: iconBtnBg }]}
          >
            <Ionicons name="create-outline" size={20} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={handleOpenFolders}
            style={[styles.iconButton, { backgroundColor: iconBtnBg }]}
          >
            <Ionicons name="folder-outline" size={20} color={colors.text} />
          </Pressable>
        </View>

        {/* Settings */}
        <Pressable
          onPress={handleSettings}
          style={[styles.collapsedFooter, { borderTopColor: colors.border }]}
        >
          <Ionicons name="settings-outline" size={20} color={colors.text} />
        </Pressable>
      </SafeAreaView>
    );
  }

  // ── Expanded mode ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: bgColor }]}
      edges={["top", "bottom"]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          OpenNativeUI
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={handleNewChat}
            style={{ ...styles.actionButton, backgroundColor: iconBtnBg }}
          >
            <Ionicons name="create-outline" size={20} color={colors.text} />
          </Pressable>
          {isDesktop && (
            <Pressable
              onPress={toggleCollapsed}
              style={{ ...styles.actionButton, backgroundColor: iconBtnBg }}
            >
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Conversation list */}
      <FlatList
        data={flatData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 8 }}
        refreshing={isLoading}
        onRefresh={handleRefresh}
        renderItem={({ item }) => {
          if (item.type === "foldersButton") {
            return (
              <Pressable
                onPress={handleOpenFolders}
                style={[styles.folderTile, { backgroundColor: tileBg }]}
              >
                <Ionicons name="folder-outline" size={18} color={colors.text} />
                <Text
                  style={[styles.folderTileName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  Folders
                </Text>
                <Ionicons name="chevron-forward" size={16} color={subText} />
              </Pressable>
            );
          }

          if (item.type === "folderTile") {
            return (
              <Pressable
                onPress={() => handleOpenFolder(item.folder)}
                style={[styles.folderTile, styles.folderTileIndent]}
              >
                <Ionicons name="folder" size={16} color={subText} />
                <Text
                  style={[styles.folderTileName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {item.folder.name}
                </Text>
                {item.count > 0 && (
                  <Text style={[styles.folderTileCount, { color: subText }]}>
                    {item.count}
                  </Text>
                )}
              </Pressable>
            );
          }

          if (item.type === "dateHeader") {
            return <Text style={styles.sectionHeader}>{item.title}</Text>;
          }

          return (
            <ConversationItem
              conversation={item.conversation}
              isActive={item.conversation.id === currentConversationId}
              onPress={() => handleSelectConversation(item.conversation.id)}
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Text style={{ color: "#737373", fontSize: 14 }}>
              No conversations yet
            </Text>
          </View>
        }
      />

      {/* Settings link */}
      <Pressable
        onPress={handleSettings}
        style={[styles.settingsRow, { borderTopColor: colors.border }]}
      >
        <Ionicons name="settings-outline" size={20} color={colors.text} />
        <Text style={[styles.settingsText, { color: colors.text }]}>
          Settings
        </Text>
      </Pressable>

      {/* Resize handle — desktop only */}
      {isDesktop && (
        <View
          style={[styles.resizeHandle, { cursor: "col-resize" } as object]}
          {...panResponder.panHandlers}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Expanded header ─────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Folder tiles ────────────────────────────────────────────────────────────
  folderTile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    marginVertical: 1,
  },
  folderTileIndent: {
    paddingLeft: 24,
    paddingVertical: 9,
  },
  folderTileName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  folderTileCount: {
    fontSize: 12,
  },

  // ── Section header / empty ───────────────────────────────────────────────────
  sectionHeader: {
    fontSize: 11,
    fontWeight: "600",
    color: "#737373",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 4,
  },
  emptyList: {
    paddingHorizontal: 16,
    paddingVertical: 48,
    alignItems: "center",
  },

  // ── Settings row ─────────────────────────────────────────────────────────────
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  settingsText: {
    fontSize: 16,
  },

  // ── Resize handle ─────────────────────────────────────────────────────────────
  resizeHandle: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 6,
    zIndex: 10,
  },

  // ── Collapsed mode ────────────────────────────────────────────────────────────
  collapsedHeader: {
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  collapsedBody: {
    flex: 1,
    alignItems: "center",
    paddingTop: 12,
    gap: 8,
  },
  collapsedFooter: {
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Kept for backward compat (no longer used directly) ────────────────────────
  newChatButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
