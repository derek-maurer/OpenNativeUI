import { useState, useRef } from "react";
import {
  View,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { useChatStore } from "@opennative/shared";
import { useModelStore } from "@opennative/shared";
import { useModelPreferencesStore } from "@opennative/shared";
import { getThinkingProfile, resolveEffectiveThinkingValue } from "@opennative/shared";
import { FileUploadProgress } from "@/components/files/FileUploadProgress";
import { ChatOptionsSheet } from "@/components/chat/ChatOptionsSheet";

interface InputComposerProps {
  onSend: (content: string) => void;
  isStreaming?: boolean;
  onStop?: () => void;
}

export function InputComposer({
  onSend,
  isStreaming,
  onStop,
}: InputComposerProps) {
  const [text, setText] = useState("");
  const [optionsVisible, setOptionsVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { dark, colors } = useTheme();
  const pendingFiles = useChatStore((s) => s.pendingFiles);
  const webSearchEnabled = useChatStore((s) => s.webSearchEnabled);
  const selectedModelId = useModelStore((s) => s.selectedModelId);
  const thinkingValue = useModelPreferencesStore((s) =>
    selectedModelId ? (s.thinkingByModel[selectedModelId] ?? null) : null,
  );
  // "Active" = thinking is effectively enabled for the current model,
  // taking the JSON-defined defaultValue into account so the indicator
  // lights up on first load when a profile defaults to on. An explicit
  // "off" (e.g. Gemma's `false` to override its default-on behavior) is
  // still treated as inactive.
  const thinkingProfile = getThinkingProfile(selectedModelId);
  const effectiveThinkingValue = resolveEffectiveThinkingValue(
    thinkingProfile,
    thinkingValue,
  );
  const thinkingActive =
    effectiveThinkingValue !== null &&
    effectiveThinkingValue !== thinkingProfile?.offValue;

  const hasActiveOptions = webSearchEnabled || thinkingActive;

  const canSend =
    text.trim().length > 0 || pendingFiles.some((f) => f.status === "ready");

  const handleSend = () => {
    if (!canSend) return;
    const content = text.trim();
    setText("");
    onSend(content);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {pendingFiles.length > 0 && <FileUploadProgress />}

      <View
        style={[
          styles.bar,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable
          onPress={() => setOptionsVisible(true)}
          style={{
            ...styles.attachButton,
            backgroundColor: hasActiveOptions
              ? "#10a37f"
              : dark
                ? "#2a2a2a"
                : "#e0e0e0",
          }}
        >
          <Ionicons
            name="add"
            size={20}
            color={hasActiveOptions ? "#fff" : colors.text}
          />
        </Pressable>

        <View
          style={[
            styles.inputContainer,
            { backgroundColor: dark ? "#1a1a1a" : "#f0f0f0" },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: colors.text }]}
            placeholder="Message..."
            placeholderTextColor="#737373"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={10000}
            returnKeyType="default"
          />
        </View>

        {isStreaming ? (
          <Pressable onPress={onStop} style={styles.stopButton}>
            <Ionicons name="stop" size={16} color="#fff" />
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={[
              styles.sendButton,
              {
                backgroundColor: canSend ? "#10a37f" : dark ? "#2a2a2a" : "#e0e0e0",
              },
            ]}
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color={canSend ? "#fff" : "#737373"}
            />
          </Pressable>
        )}
      </View>

      <ChatOptionsSheet
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  inputContainer: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 6,
    minHeight: 36,
    maxHeight: 140,
    justifyContent: "center",
  },
  input: {
    fontSize: 16,
    lineHeight: 20,
    maxHeight: 120,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  stopButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#525252",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
});
