import { ModelSelectorTrigger } from "@/components/chat/ModelSelector";
import { SFSymbol } from "@/components/ui/SFSymbol";
import { getThinkingProfile, resolveEffectiveThinkingValue, useChatStore, useModelPreferencesStore, useModelStore } from "@opennative/shared";
import { useTheme } from "@react-navigation/native";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

interface InputComposerProps {
  onSend: (content: string) => void;
  isStreaming?: boolean;
  onStop?: () => void;
  onOpenMenu: () => void;
  onOpenModelPicker: () => void;
}

export function InputComposer({
  onSend,
  isStreaming,
  onStop,
  onOpenMenu,
  onOpenModelPicker,
}: InputComposerProps) {
  const [text, setText] = useState("");
  const { dark, colors } = useTheme();

  const webSearchEnabled = useChatStore((s) => s.webSearchEnabled);
  const selectedModelId = useModelStore((s) => s.selectedModelId);
  const thinkingValue = useModelPreferencesStore((s) =>
    selectedModelId ? (s.thinkingByModel[selectedModelId] ?? null) : null,
  );
  const thinkingProfile = getThinkingProfile(selectedModelId);
  const effectiveThinkingValue = resolveEffectiveThinkingValue(thinkingProfile, thinkingValue);
  const thinkingActive =
    effectiveThinkingValue !== null &&
    effectiveThinkingValue !== thinkingProfile?.offValue;

  const hasActiveOptions = webSearchEnabled || thinkingActive;

  const canSend = text.trim().length > 0;

  const handleSend = () => {
    if (!canSend) return;
    const content = text.trim();
    setText("");
    onSend(content);
  };

  const containerBg = dark ? "#1c1c1c" : "#f5f5f5";
  const containerBorder = dark ? "#333" : "#e0e0e0";
  const plusColor = hasActiveOptions ? "#10a37f" : "#737373";

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { backgroundColor: containerBg, borderColor: containerBorder }]}>
        {/* Text input — no own background, sits directly in the container */}
        {/* focusRingType is a macOS-specific prop to suppress the native focus ring */}
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Message…"
          placeholderTextColor="#737373"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={10000}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          {...({ focusRingType: "none" } as object)}
        />

        {/* Bottom toolbar: [+]  [model selector]  [send/stop] */}
        <View style={styles.toolbar}>
          <Pressable
            onPress={onOpenMenu}
            style={styles.toolbarBtn}
            accessibilityLabel="Chat options"
          >
            <SFSymbol name="plus" size={18} color={plusColor} />
          </Pressable>

          <ModelSelectorTrigger onPress={onOpenModelPicker} />

          {isStreaming ? (
            <Pressable onPress={onStop} style={styles.stopButton}>
              <SFSymbol name="stop.fill" size={12} color="#fff" />
            </Pressable>
          ) : (
            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              style={[
                styles.sendButton,
                { backgroundColor: canSend ? "#10a37f" : dark ? "#2a2a2a" : "#d4d4d4" },
              ]}
            >
              <SFSymbol name="arrow.up" size={15} color={canSend ? "#fff" : "#737373"} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
  },
  container: {
    borderRadius: 16,
    borderWidth: 1,
  },
  input: {
    fontSize: 15,
    lineHeight: 21,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
    minHeight: 44,
    maxHeight: 160
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  toolbarBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
  },
  sendButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  stopButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#525252",
    alignItems: "center",
    justifyContent: "center",
  },
});
