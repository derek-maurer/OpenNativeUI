import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { useChatStore } from "@/stores/chatStore";
import { useModelStore } from "@/stores/modelStore";
import { useFileUpload } from "@/hooks/useFileUpload";
import { BottomSheet } from "@/components/common/BottomSheet";
import { getModelCapabilities } from "@/lib/modelCapabilities";

interface ChatOptionsSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function ChatOptionsSheet({ visible, onClose }: ChatOptionsSheetProps) {
  const { dark, colors } = useTheme();
  const webSearchEnabled = useChatStore((s) => s.webSearchEnabled);
  const toggleWebSearch = useChatStore((s) => s.toggleWebSearch);
  const thinkingLevel = useChatStore((s) => s.thinkingLevel);
  const setThinkingLevel = useChatStore((s) => s.setThinkingLevel);
  const selectedModelId = useModelStore((s) => s.selectedModelId);
  const { pickAndUpload, pickPhotoAndUpload } = useFileUpload();

  const thinkingCapability = getModelCapabilities(selectedModelId).thinking;
  const thinkingEnabled = thinkingLevel !== null;

  const handlePickFile = async () => {
    onClose();
    // Allow the Modal to fully dismiss before presenting the system picker
    await new Promise((resolve) => setTimeout(resolve, 500));
    await pickAndUpload();
  };

  const handlePickPhoto = async () => {
    onClose();
    // Allow the Modal to fully dismiss before presenting the system picker
    await new Promise((resolve) => setTimeout(resolve, 500));
    await pickPhotoAndUpload();
  };

  const sheetBg = dark ? "#1a1a1a" : "#fff";
  const rowBg = dark ? "#262626" : "#f5f5f5";

  return (
    <BottomSheet visible={visible} onClose={onClose} backgroundColor={sheetBg}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Options</Text>

        {/* Web Search */}
        <Pressable
          onPress={toggleWebSearch}
          style={[styles.row, { backgroundColor: rowBg }]}
        >
          <View style={styles.rowIcon}>
            <Ionicons
              name="globe-outline"
              size={22}
              color={webSearchEnabled ? "#10a37f" : "#737373"}
            />
          </View>
          <Text style={[styles.rowLabel, { color: colors.text }]}>
            Web Search
          </Text>
          <View
            style={[
              styles.toggle,
              webSearchEnabled
                ? styles.toggleOn
                : { backgroundColor: dark ? "#404040" : "#d4d4d4" },
            ]}
          >
            <View
              style={[
                styles.toggleThumb,
                webSearchEnabled && styles.toggleThumbOn,
              ]}
            />
          </View>
        </Pressable>

        {/* Attach File */}
        <Pressable
          onPress={handlePickFile}
          style={[styles.row, { backgroundColor: rowBg }]}
        >
          <View style={styles.rowIcon}>
            <Ionicons name="document-outline" size={22} color="#737373" />
          </View>
          <Text style={[styles.rowLabel, { color: colors.text }]}>
            Attach File
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#737373" />
        </Pressable>

        {/* Attach Photo */}
        <Pressable
          onPress={handlePickPhoto}
          style={[styles.row, { backgroundColor: rowBg }]}
        >
          <View style={styles.rowIcon}>
            <Ionicons name="image-outline" size={22} color="#737373" />
          </View>
          <Text style={[styles.rowLabel, { color: colors.text }]}>
            Attach Photo
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#737373" />
        </Pressable>

        {/* Thinking toggle — for models with binary on/off thinking (e.g. Gemma 3+) */}
        {thinkingCapability.mode === "binary" && (
          <Pressable
            onPress={() => setThinkingLevel(thinkingEnabled ? null : "medium")}
            style={[styles.row, { backgroundColor: rowBg }]}
          >
            <View style={styles.rowIcon}>
              <Ionicons
                name="bulb-outline"
                size={22}
                color={thinkingEnabled ? "#10a37f" : "#737373"}
              />
            </View>
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              Thinking
            </Text>
            <View
              style={[
                styles.toggle,
                thinkingEnabled
                  ? styles.toggleOn
                  : { backgroundColor: dark ? "#404040" : "#d4d4d4" },
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  thinkingEnabled && styles.toggleThumbOn,
                ]}
              />
            </View>
          </Pressable>
        )}

        {/* Thinking Level — for models with tiered thinking effort (e.g. GPT-OSS) */}
        {thinkingCapability.mode === "tiered" && (
          <View style={[styles.thinkingSection, { backgroundColor: rowBg }]}>
            <View style={styles.thinkingHeader}>
              <View style={styles.rowIcon}>
                <Ionicons
                  name="bulb-outline"
                  size={22}
                  color={thinkingLevel ? "#10a37f" : "#737373"}
                />
              </View>
              <Text style={[styles.rowLabel, { color: colors.text, flex: 1 }]}>
                Thinking Level
              </Text>
            </View>

            <View style={styles.thinkingOptions}>
              {thinkingCapability.levels.map((level) => {
                const active = thinkingLevel === level;
                return (
                  <Pressable
                    key={level}
                    onPress={() =>
                      setThinkingLevel(active ? null : level)
                    }
                    style={[
                      styles.thinkingChip,
                      {
                        borderColor: active
                          ? "#10a37f"
                          : dark
                            ? "#404040"
                            : "#d4d4d4",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.thinkingChipText,
                        { color: active ? "#10a37f" : "#737373" },
                      ]}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

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
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleOn: {
    backgroundColor: "#10a37f",
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
  },
  thinkingSection: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
  },
  thinkingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  thinkingOptions: {
    flexDirection: "row",
    gap: 8,
    paddingLeft: 40,
  },
  thinkingChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
  },
  thinkingChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
