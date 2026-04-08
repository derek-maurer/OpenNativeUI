import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@react-navigation/native";
import {
  useChatStore,
  useModelStore,
  useModelPreferencesStore,
  getThinkingProfile,
  resolveEffectiveThinkingValue,
} from "@opennative/shared";
import { SFSymbol } from "@/components/ui/SFSymbol";
import type { ThinkingValue } from "@opennative/shared";

interface ChatOptionsMenuProps {
  visible: boolean;
  onClose: () => void;
  onAttachFile?: () => void;
  onAttachPhoto?: () => void;
}

export function ChatOptionsMenu({
  visible,
  onClose,
  onAttachFile,
  onAttachPhoto,
}: ChatOptionsMenuProps) {
  const { dark, colors } = useTheme();
  const webSearchEnabled = useChatStore((s) => s.webSearchEnabled);
  const toggleWebSearch = useChatStore((s) => s.toggleWebSearch);
  const selectedModelId = useModelStore((s) => s.selectedModelId);
  const thinkingValue = useModelPreferencesStore((s) =>
    selectedModelId ? (s.thinkingByModel[selectedModelId] ?? null) : null,
  );
  const setThinkingForModel = useModelPreferencesStore(
    (s) => s.setThinkingForModel,
  );

  const thinkingProfile = getThinkingProfile(selectedModelId);
  const effectiveThinkingValue = resolveEffectiveThinkingValue(
    thinkingProfile,
    thinkingValue,
  );
  const isBinaryToggle = thinkingProfile?.options.length === 1;
  const onValue = thinkingProfile?.options[0]?.value;
  const isThinkingOn =
    isBinaryToggle && onValue !== undefined && effectiveThinkingValue === onValue;

  const setThinking = (value: ThinkingValue | null) => {
    if (!selectedModelId) return;
    setThinkingForModel(selectedModelId, value);
  };

  if (!visible) return null;

  const panelBg = dark ? "#1e1e1e" : "#fff";
  const rowBg = dark ? "#2a2a2a" : "#f5f5f5";

  return (
    <>
      {/* Invisible full-screen backdrop to dismiss on outside click */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

      <View style={[styles.panel, { backgroundColor: panelBg }]}>
        <Text style={[styles.title, { color: colors.text }]}>Options</Text>

        {/* Web Search */}
        <Pressable
          onPress={toggleWebSearch}
          style={[styles.row, { backgroundColor: rowBg }]}
        >
          <View style={styles.rowIcon}>
            <SFSymbol
              name="globe"
              size={18}
              color={webSearchEnabled ? "#10a37f" : "#737373"}
            />
          </View>
          <Text style={[styles.rowLabel, { color: colors.text }]}>
            Web Search
          </Text>
          <Toggle on={webSearchEnabled} dark={dark} />
        </Pressable>

        {/* Thinking — binary toggle */}
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
              <SFSymbol
                name="lightbulb"
                size={18}
                color={isThinkingOn ? "#10a37f" : "#737373"}
              />
            </View>
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              {thinkingProfile.label}
            </Text>
            <Toggle on={isThinkingOn} dark={dark} />
          </Pressable>
        )}

        {/* Thinking — chip group */}
        {thinkingProfile && !isBinaryToggle && (
          <View style={[styles.thinkingSection, { backgroundColor: rowBg }]}>
            <View style={styles.thinkingHeader}>
              <View style={styles.rowIcon}>
                <SFSymbol
                  name="lightbulb"
                  size={18}
                  color={effectiveThinkingValue !== null ? "#10a37f" : "#737373"}
                />
              </View>
              <Text
                style={[styles.rowLabel, { color: colors.text, flex: 1 }]}
              >
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

        {/* Attach File */}
        {onAttachFile && (
          <Pressable
            onPress={() => { onAttachFile(); onClose(); }}
            style={[styles.row, { backgroundColor: rowBg }]}
          >
            <View style={styles.rowIcon}>
              <SFSymbol name="doc" size={18} color="#737373" />
            </View>
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              Attach File
            </Text>
            <SFSymbol name="chevron.right" size={14} color="#737373" />
          </Pressable>
        )}

        {/* Attach Photo */}
        {onAttachPhoto && (
          <Pressable
            onPress={() => { onAttachPhoto(); onClose(); }}
            style={[styles.row, { backgroundColor: rowBg }]}
          >
            <View style={styles.rowIcon}>
              <SFSymbol name="photo" size={18} color="#737373" />
            </View>
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              Attach Photo
            </Text>
            <SFSymbol name="chevron.right" size={14} color="#737373" />
          </Pressable>
        )}
      </View>
    </>
  );
}

function Toggle({ on, dark }: { on: boolean; dark: boolean }) {
  return (
    <View
      style={[
        styles.toggle,
        on ? styles.toggleOn : { backgroundColor: dark ? "#404040" : "#d4d4d4" },
      ]}
    >
      <View style={[styles.toggleThumb, on && styles.toggleThumbOn]} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    bottom: 60,
    left: 12,
    width: 290,
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 100,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 6,
  },
  rowIcon: {
    width: 28,
    alignItems: "center",
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
  },
  toggle: {
    width: 40,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleOn: {
    backgroundColor: "#10a37f",
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
  },
  thinkingSection: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 6,
  },
  thinkingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  thinkingOptions: {
    flexDirection: "row",
    gap: 6,
    paddingLeft: 36,
  },
  thinkingChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
  },
  thinkingChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
