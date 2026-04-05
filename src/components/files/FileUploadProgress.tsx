import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useChatStore } from "@/stores/chatStore";

export function FileUploadProgress() {
  const pendingFiles = useChatStore((s) => s.pendingFiles);
  const removePendingFile = useChatStore((s) => s.removePendingFile);

  if (pendingFiles.length === 0) return null;

  return (
    <View style={styles.container}>
      {pendingFiles.map((file) => (
        <View key={file.id} style={styles.chip}>
          <Ionicons
            name={
              file.status === "ready"
                ? "checkmark-circle"
                : file.status === "error"
                  ? "alert-circle"
                  : "cloud-upload"
            }
            size={16}
            color={
              file.status === "ready"
                ? "#10a37f"
                : file.status === "error"
                  ? "#ef4444"
                  : "#737373"
            }
          />
          <Text style={styles.chipText} numberOfLines={1}>
            {file.name}
          </Text>
          <Pressable onPress={() => removePendingFile(file.id)}>
            <Ionicons name="close" size={16} color="#737373" />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 13,
    color: "#a3a3a3",
    maxWidth: 120,
  },
});
