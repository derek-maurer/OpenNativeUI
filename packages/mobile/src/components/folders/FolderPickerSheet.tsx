import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { BottomSheet } from "@/components/common/BottomSheet";
import { useFolderStore } from "@opennative/shared";

interface FolderPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  currentFolderId: string | null;
  onSelect: (folderId: string | null) => void;
}

export function FolderPickerSheet({
  visible,
  onClose,
  currentFolderId,
  onSelect,
}: FolderPickerSheetProps) {
  const { dark, colors } = useTheme();
  const folders = useFolderStore((s) => s.folders);

  const sheetBg = dark ? "#1a1a1a" : "#fff";
  const rowBg = dark ? "#262626" : "#f5f5f5";
  const activeColor = "#10a37f";

  const handleSelect = (folderId: string | null) => {
    onSelect(folderId);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} backgroundColor={sheetBg}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Move to folder</Text>

        <ScrollView style={{ maxHeight: 400 }}>
          {/* None / un-assign */}
          <Pressable
            onPress={() => handleSelect(null)}
            style={[styles.row, { backgroundColor: rowBg }]}
          >
            <View style={styles.rowIcon}>
              <Ionicons
                name="remove-circle-outline"
                size={22}
                color={currentFolderId === null ? activeColor : "#737373"}
              />
            </View>
            <Text style={[styles.rowLabel, { color: colors.text }]}>None</Text>
            {currentFolderId === null && (
              <Ionicons name="checkmark" size={20} color={activeColor} />
            )}
          </Pressable>

          {folders.length === 0 && (
            <Text style={styles.emptyText}>
              No folders yet. Create one in Settings.
            </Text>
          )}

          {folders.map((folder) => {
            const active = folder.id === currentFolderId;
            return (
              <Pressable
                key={folder.id}
                onPress={() => handleSelect(folder.id)}
                style={[styles.row, { backgroundColor: rowBg }]}
              >
                <View style={styles.rowIcon}>
                  <Ionicons
                    name="folder-outline"
                    size={22}
                    color={active ? activeColor : "#737373"}
                  />
                </View>
                <Text
                  style={[styles.rowLabel, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {folder.name}
                </Text>
                {active && (
                  <Ionicons name="checkmark" size={20} color={activeColor} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ height: 16 }} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 34,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  rowIcon: {
    width: 32,
    alignItems: "center",
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
  },
  emptyText: {
    color: "#737373",
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 24,
  },
});
