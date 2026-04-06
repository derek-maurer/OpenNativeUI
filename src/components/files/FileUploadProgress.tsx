import { View, Text, Image, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { useChatStore } from "@/stores/chatStore";

const THUMB = 64;

function isImage(mimeType?: string) {
  return mimeType?.startsWith("image/") ?? false;
}

function fileExtension(name: string) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toUpperCase() : "";
}

export function FileUploadProgress() {
  const { dark } = useTheme();
  const pendingFiles = useChatStore((s) => s.pendingFiles);
  const removePendingFile = useChatStore((s) => s.removePendingFile);

  if (pendingFiles.length === 0) return null;

  const cardBg = dark ? "#262626" : "#f0f0f0";

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.row}
    >
      {pendingFiles.map((file) => {
        const showImage = isImage(file.mimeType) && file.uri;
        const busy = file.status === "uploading" || file.status === "processing";

        return (
          <View key={file.id} style={[styles.card, { backgroundColor: cardBg }]}>
            {/* Remove button */}
            <Pressable
              onPress={() => removePendingFile(file.id)}
              style={styles.removeBtn}
              hitSlop={6}
            >
              <Ionicons name="close-circle" size={20} color={dark ? "#a3a3a3" : "#737373"} />
            </Pressable>

            {showImage ? (
              <Image source={{ uri: file.uri }} style={styles.thumb} />
            ) : (
              <View style={[styles.filePlaceholder, { backgroundColor: dark ? "#333" : "#e0e0e0" }]}>
                <Ionicons name="document" size={24} color={dark ? "#737373" : "#999"} />
                <Text style={styles.ext} numberOfLines={1}>
                  {fileExtension(file.name)}
                </Text>
              </View>
            )}

            {/* Status overlay */}
            {busy && (
              <View style={styles.overlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
            {file.status === "error" && (
              <View style={styles.overlay}>
                <Ionicons name="alert-circle" size={22} color="#ef4444" />
              </View>
            )}

            {/* Filename */}
            <Text
              style={[styles.name, { color: dark ? "#a3a3a3" : "#525252" }]}
              numberOfLines={1}
            >
              {file.name}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  card: {
    width: THUMB + 16,
    borderRadius: 10,
    paddingBottom: 6,
    overflow: "hidden",
  },
  removeBtn: {
    position: "absolute",
    top: 2,
    right: 2,
    zIndex: 10,
  },
  thumb: {
    width: THUMB + 16,
    height: THUMB,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  filePlaceholder: {
    width: THUMB + 16,
    height: THUMB,
    alignItems: "center",
    justifyContent: "center",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  ext: {
    fontSize: 10,
    fontWeight: "700",
    color: "#737373",
    marginTop: 2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    top: 0,
    height: THUMB,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  name: {
    fontSize: 10,
    marginTop: 4,
    marginHorizontal: 6,
  },
});
