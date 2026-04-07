import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { useChatStore, useModelStore, useModelPreferencesStore, getThinkingProfile, resolveEffectiveThinkingValue } from "@opennative/shared";

interface InputComposerProps {
  onSend: (content: string) => void;
  isStreaming?: boolean;
  onStop?: () => void;
}

export function InputComposer({ onSend, isStreaming, onStop }: InputComposerProps) {
  const [text, setText] = useState("");
  const { dark, colors } = useTheme();

  const webSearchEnabled = useChatStore((s) => s.webSearchEnabled);
  const toggleWebSearch = useChatStore((s) => s.toggleWebSearch);
  const selectedModelId = useModelStore((s) => s.selectedModelId);
  const thinkingValue = useModelPreferencesStore((s) =>
    selectedModelId ? (s.thinkingByModel[selectedModelId] ?? null) : null,
  );
  const thinkingProfile = getThinkingProfile(selectedModelId);
  const effectiveThinkingValue = resolveEffectiveThinkingValue(thinkingProfile, thinkingValue);
  const thinkingActive =
    effectiveThinkingValue !== null &&
    effectiveThinkingValue !== thinkingProfile?.offValue;

  const canSend = text.trim().length > 0;

  const handleSend = () => {
    if (!canSend) return;
    const content = text.trim();
    setText("");
    onSend(content);
  };

  const inputBg = dark ? "#1a1a1a" : "#f0f0f0";
  const webBg = webSearchEnabled ? "#10a37f" : dark ? "#2a2a2a" : "#e0e0e0";

  return (
    <View style={[styles.bar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
      {/* Web search toggle */}
      <Pressable
        onPress={toggleWebSearch}
        style={[styles.iconButton, { backgroundColor: webBg }]}
        accessibilityLabel="Toggle web search"
      >
        <Text style={[styles.iconButtonText, { color: webSearchEnabled ? "#fff" : colors.text }]}>
          🔍
        </Text>
      </Pressable>

      {/* Text input */}
      <View style={[styles.inputContainer, { backgroundColor: inputBg }]}>
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
        />
      </View>

      {/* Send / Stop */}
      {isStreaming ? (
        <Pressable onPress={onStop} style={styles.stopButton}>
          <Text style={styles.stopIcon}>■</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={[styles.sendButton, { backgroundColor: canSend ? "#10a37f" : dark ? "#2a2a2a" : "#e0e0e0" }]}
        >
          <Text style={[styles.sendIcon, { color: canSend ? "#fff" : "#737373" }]}>↑</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
  iconButtonText: { fontSize: 15 },
  inputContainer: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minHeight: 36,
    maxHeight: 160,
    justifyContent: "center",
  },
  input: { fontSize: 15, lineHeight: 20, maxHeight: 140 },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
  sendIcon: { fontSize: 18, fontWeight: "600" },
  stopButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#525252",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
  stopIcon: { color: "#fff", fontSize: 12 },
});
