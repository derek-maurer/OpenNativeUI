import { useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";

import {
  filterConversations,
  groupConversationsByDate,
} from "@opennative/shared";
import type { Conversation, Folder } from "@opennative/shared";

import { useDrawerResize } from "@/hooks/useDrawerResize";
import { getRecentFolders } from "@/lib/folderUtils";
import { ConversationItem } from "./ConversationItem";

const MAX_RECENT_FOLDERS = 3;

type Row =
  | { type: "foldersButton"; id: string }
  | { type: "folderTile"; folder: Folder; count: number; id: string }
  | { type: "dateHeader"; title: string; id: string }
  | { type: "item"; conversation: Conversation; id: string };

interface ExpandedDrawerProps {
  conversations: Conversation[];
  folders: Folder[];
  currentConversationId: string | null;
  isLoading: boolean;
  canCollapse: boolean;
  onRefresh: () => Promise<void>;
  onNewChat: () => void;
  onToggleCollapsed: () => void;
  onSelectConversation: (id: string) => void;
  onOpenFolders: () => void;
  onOpenFolder: (folder: Folder) => void;
  onOpenSettings: () => void;
}

export function ExpandedDrawer({
  conversations,
  folders,
  currentConversationId,
  isLoading,
  canCollapse,
  onRefresh,
  onNewChat,
  onToggleCollapsed,
  onSelectConversation,
  onOpenFolders,
  onOpenFolder,
  onOpenSettings,
}: ExpandedDrawerProps) {
  const { colors, dark } = useTheme();
  const panResponder = useDrawerResize();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<TextInput>(null);

  const tileBg = dark ? "#141414" : "#f0f0f0";
  const subText = dark ? "#a3a3a3" : "#525252";
  const bgColor = dark ? "#0d0d0d" : "#f9f9f9";
  const iconBtnBg = dark ? "#2a2a2a" : "#e5e5e5";

  const isDesktop = Platform.OS === "web";

  const handleOpenSearch = () => {
    setSearchOpen(true);
    setSearchQuery("");
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const handleCloseSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  const recentFolders = getRecentFolders(folders, conversations, MAX_RECENT_FOLDERS);

  const flatData: Row[] = [{ type: "foldersButton", id: "folders-button" }];
  for (const { folder, count } of recentFolders) {
    flatData.push({ type: "folderTile", folder, count, id: `folder-${folder.id}` });
  }
  for (const group of groupConversationsByDate(conversations)) {
    flatData.push({ type: "dateHeader", title: group.title, id: `date-${group.title}` });
    for (const conv of group.data) {
      flatData.push({ type: "item", conversation: conv, id: conv.id });
    }
  }

  const searchResults = filterConversations(conversations, searchQuery);
  const listData: Row[] = searchOpen
    ? searchResults.map((c) => ({ type: "item" as const, conversation: c, id: c.id }))
    : flatData;

  const renderRow = ({ item }: { item: Row }) => {
    if (item.type === "foldersButton") {
      return (
        <Pressable
          onPress={onOpenFolders}
          style={[styles.folderTile, { backgroundColor: tileBg }]}
        >
          <Ionicons name="folder-outline" size={18} color={colors.text} />
          <Text style={[styles.folderTileName, { color: colors.text }]} numberOfLines={1}>
            Folders
          </Text>
          <Ionicons name="chevron-forward" size={16} color={subText} />
        </Pressable>
      );
    }

    if (item.type === "folderTile") {
      return (
        <Pressable
          onPress={() => onOpenFolder(item.folder)}
          style={[styles.folderTile, styles.folderTileIndent]}
        >
          <Ionicons name="folder" size={16} color={subText} />
          <Text style={[styles.folderTileName, { color: colors.text }]} numberOfLines={1}>
            {item.folder.name}
          </Text>
          {item.count > 0 && (
            <Text style={[styles.folderTileCount, { color: subText }]}>{item.count}</Text>
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
        onPress={() => onSelectConversation(item.conversation.id)}
      />
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: bgColor }]}
      edges={["top", "bottom"]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>OpenNativeUI</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={handleOpenSearch}
            style={{ ...styles.actionButton, backgroundColor: iconBtnBg }}
          >
            <Ionicons name="search-outline" size={20} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={onNewChat}
            style={{ ...styles.actionButton, backgroundColor: iconBtnBg }}
          >
            <Ionicons name="create-outline" size={20} color={colors.text} />
          </Pressable>
          {canCollapse && (
            <Pressable
              onPress={onToggleCollapsed}
              style={{ ...styles.actionButton, backgroundColor: iconBtnBg }}
            >
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Search bar */}
      {searchOpen && (
        <View
          style={[
            styles.searchBar,
            {
              borderBottomColor: colors.border,
              backgroundColor: dark ? "#1a1a1a" : "#f0f0f0",
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={16}
            color={subText}
            style={{ marginRight: 8 }}
          />
          <TextInput
            ref={searchInputRef}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search conversations…"
            placeholderTextColor={subText}
            style={[styles.searchInput, { color: colors.text }]}
            autoFocus
            returnKeyType="search"
          />
          <Pressable onPress={handleCloseSearch} hitSlop={8}>
            <Ionicons name="close-outline" size={20} color={subText} />
          </Pressable>
        </View>
      )}

      {/* Conversation list */}
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 8 }}
        refreshing={isLoading}
        onRefresh={onRefresh}
        renderItem={renderRow}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Text style={{ color: "#737373", fontSize: 14 }}>
              {searchOpen && searchQuery.trim()
                ? "No conversations found"
                : "No conversations yet"}
            </Text>
          </View>
        }
      />

      {/* Settings link */}
      <Pressable
        onPress={onOpenSettings}
        style={[styles.settingsRow, { borderTopColor: colors.border }]}
      >
        <Ionicons name="settings-outline" size={20} color={colors.text} />
        <Text style={[styles.settingsText, { color: colors.text }]}>Settings</Text>
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
  resizeHandle: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 6,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
});
