import { useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  FlatList,
  StyleSheet,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Swipeable } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";

import { useFolderStore } from "@/stores/folderStore";
import type { Folder } from "@/lib/types";

function FolderRow({
  folder,
  onRename,
  onDelete,
}: {
  folder: Folder;
  onRename: (folder: Folder) => void;
  onDelete: (folder: Folder) => void;
}) {
  const { dark, colors } = useTheme();
  const swipeableRef = useRef<Swipeable>(null);

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
      <Pressable
        onPress={() => {
          swipeableRef.current?.close();
          onDelete(folder);
        }}
        style={styles.deleteAction}
      >
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
        onPress={() => onRename(folder)}
        style={[
          styles.folderRow,
          { backgroundColor: dark ? "#141414" : "#f5f5f5" },
        ]}
      >
        <Ionicons
          name="folder-outline"
          size={20}
          color={dark ? "#a3a3a3" : "#525252"}
        />
        <Text
          style={[styles.folderName, { color: colors.text }]}
          numberOfLines={1}
        >
          {folder.name}
        </Text>
        <Ionicons name="pencil-outline" size={16} color="#737373" />
      </Pressable>
    </Swipeable>
  );
}

export default function FoldersScreen() {
  const router = useRouter();
  const { colors, dark } = useTheme();
  const folders = useFolderStore((s) => s.folders);
  const isLoading = useFolderStore((s) => s.isLoading);
  const loadFolders = useFolderStore((s) => s.loadFolders);
  const createFolder = useFolderStore((s) => s.createFolder);
  const renameFolder = useFolderStore((s) => s.renameFolder);
  const deleteFolder = useFolderStore((s) => s.deleteFolder);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const handleCreate = () => {
    Alert.prompt(
      "New Folder",
      "Enter a name:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create",
          onPress: async (name?: string) => {
            const trimmed = name?.trim();
            if (!trimmed) return;
            try {
              await createFolder(trimmed);
            } catch (e) {
              Alert.alert(
                "Error",
                e instanceof Error ? e.message : "Failed to create folder"
              );
            }
          },
        },
      ],
      "plain-text"
    );
  };

  const handleRename = (folder: Folder) => {
    Alert.prompt(
      "Rename Folder",
      "Enter a new name:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: async (name?: string) => {
            const trimmed = name?.trim();
            if (!trimmed || trimmed === folder.name) return;
            try {
              await renameFolder(folder.id, trimmed);
            } catch (e) {
              Alert.alert(
                "Error",
                e instanceof Error ? e.message : "Failed to rename folder"
              );
            }
          },
        },
      ],
      "plain-text",
      folder.name
    );
  };

  const handleDelete = (folder: Folder) => {
    Alert.alert(
      "Delete Folder",
      `Delete "${folder.name}"? Conversations inside will be unfoldered.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteFolder(folder.id);
            } catch (e) {
              Alert.alert(
                "Error",
                e instanceof Error ? e.message : "Failed to delete folder"
              );
            }
          },
        },
      ]
    );
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Folders
        </Text>
        <Pressable onPress={handleCreate} style={{ padding: 6 }}>
          <Ionicons name="add" size={26} color={colors.text} />
        </Pressable>
      </View>

      <FlatList
        data={folders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        refreshing={isLoading}
        onRefresh={loadFolders}
        renderItem={({ item }) => (
          <FolderRow
            folder={item}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="folder-open-outline"
              size={40}
              color={dark ? "#404040" : "#d4d4d4"}
            />
            <Text style={styles.emptyText}>No folders yet</Text>
            <Text style={styles.emptyHint}>
              Tap + in the top right to create one.
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  folderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
  folderName: {
    flex: 1,
    fontSize: 16,
  },
  deleteAction: {
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    width: 72,
    borderRadius: 12,
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
  },
});
