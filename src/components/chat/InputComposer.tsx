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
import { useChatStore } from "@/stores/chatStore";
import { useFileUpload } from "@/hooks/useFileUpload";
import { FileUploadProgress } from "@/components/files/FileUploadProgress";

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
  const inputRef = useRef<TextInput>(null);
  const { dark, colors } = useTheme();
  const pendingFiles = useChatStore((s) => s.pendingFiles);
  const webSearchEnabled = useChatStore((s) => s.webSearchEnabled);
  const toggleWebSearch = useChatStore((s) => s.toggleWebSearch);
  const { pickAndUpload } = useFileUpload();

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
      {pendingFiles.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <FileUploadProgress />
        </View>
      )}

      <View
        style={[
          styles.bar,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable onPress={pickAndUpload} style={styles.attachButton}>
          <Ionicons name="add-circle" size={28} color="#737373" />
        </Pressable>

        <Pressable onPress={toggleWebSearch} style={styles.attachButton}>
          <Ionicons
            name="globe-outline"
            size={24}
            color={webSearchEnabled ? "#10a37f" : "#737373"}
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
    paddingBottom: 4,
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
