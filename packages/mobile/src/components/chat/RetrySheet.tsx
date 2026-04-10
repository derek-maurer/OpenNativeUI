import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { BottomSheet } from "@/components/common/BottomSheet";
import {
  useModelPreferencesStore,
  getThinkingProfile,
  resolveEffectiveThinkingValue,
  type ThinkingValue,
} from "@opennative/shared";

interface RetrySheetProps {
  visible: boolean;
  onClose: () => void;
  onRetry: () => void;
  modelId: string | null;
}

export function RetrySheet({ visible, onClose, onRetry, modelId }: RetrySheetProps) {
  const { dark, colors } = useTheme();
  const thinkingProfile = getThinkingProfile(modelId);
  const thinkingValue = useModelPreferencesStore((s) =>
    modelId ? (s.thinkingByModel[modelId] ?? null) : null,
  );
  const setThinkingForModel = useModelPreferencesStore((s) => s.setThinkingForModel);

  const effectiveThinkingValue = resolveEffectiveThinkingValue(thinkingProfile, thinkingValue);
  const isBinaryToggle = thinkingProfile?.options.length === 1;
  const onValue = thinkingProfile?.options[0]?.value;
  const isThinkingOn =
    isBinaryToggle && onValue !== undefined && effectiveThinkingValue === onValue;

  const setThinking = (value: ThinkingValue | null) => {
    if (!modelId) return;
    setThinkingForModel(modelId, value);
  };

  const rowBg = dark ? "#262626" : "#f5f5f5";
  const sheetBg = dark ? "#1a1a1a" : "#fff";

  return (
    <BottomSheet visible={visible} onClose={onClose} backgroundColor={sheetBg}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Retry</Text>

        {thinkingProfile && isBinaryToggle && (
          <Pressable
            onPress={() =>
              setThinking(
                isThinkingOn
                  ? (thinkingProfile.offValue ?? null)
                  : thinkingProfile.options[0]!.value,
              )
            }
            style={[styles.row, { backgroundColor: rowBg }]}
          >
            <View style={styles.rowIcon}>
              <Ionicons
                name="bulb-outline"
                size={22}
                color={isThinkingOn ? "#10a37f" : "#737373"}
              />
            </View>
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              {thinkingProfile.label}
            </Text>
            <View
              style={[
                styles.toggle,
                isThinkingOn
                  ? styles.toggleOn
                  : { backgroundColor: dark ? "#404040" : "#d4d4d4" },
              ]}
            >
              <View
                style={[styles.toggleThumb, isThinkingOn && styles.toggleThumbOn]}
              />
            </View>
          </Pressable>
        )}

        {thinkingProfile && !isBinaryToggle && (
          <View style={[styles.thinkingSection, { backgroundColor: rowBg }]}>
            <View style={styles.thinkingHeader}>
              <View style={styles.rowIcon}>
                <Ionicons
                  name="bulb-outline"
                  size={22}
                  color={effectiveThinkingValue !== null ? "#10a37f" : "#737373"}
                />
              </View>
              <Text style={[styles.rowLabel, { color: colors.text, flex: 1 }]}>
                {thinkingProfile.label}
              </Text>
            </View>
            <View style={styles.thinkingOptions}>
              {thinkingProfile.options.map((option) => {
                const active = effectiveThinkingValue === option.value;
                return (
                  <Pressable
                    key={String(option.value)}
                    onPress={() => setThinking(active ? null : option.value)}
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
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <Pressable onPress={onRetry} style={styles.retryButton}>
          <Ionicons name="refresh-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>

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
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10a37f",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
