import { memo, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import { useTheme } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import * as Clipboard from "expo-clipboard";
import { useToast } from "@/components/ui/Toast";
import { MessageActions } from "./MessageActions";
import type { MessageInfo } from "@/lib/types";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  isStreaming?: boolean;
  info?: MessageInfo;
}

function CodeBlock({ code, style, dark }: { code: string; style: any; dark: boolean }) {
  const toast = useToast();

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(code);
    toast.show("Copied to clipboard");
  }, [code, toast]);

  return (
    <View style={[style.fence, { position: "relative" as const }]}>
      <TouchableOpacity
        onPress={handleCopy}
        style={[
          codeBlockStyles.copyButton,
          { backgroundColor: dark ? "#333" : "#e0e0e0" },
        ]}
        activeOpacity={0.7}
      >
        <Ionicons
          name="copy-outline"
          size={14}
          color={dark ? "#aaa" : "#555"}
        />
      </TouchableOpacity>
      <Text style={{ color: style.fence.color, fontSize: style.fence.fontSize, fontFamily: style.fence.fontFamily }}>
        {code}
      </Text>
    </View>
  );
}

export const MessageBubble = memo(function MessageBubble({
  role,
  content,
  isStreaming,
  info,
}: MessageBubbleProps) {
  const { colors, dark } = useTheme();

  const handleLinkPress = useCallback((url: string) => {
    WebBrowser.openBrowserAsync(url, {
      dismissButtonStyle: "close",
    });
    return false;
  }, []);

  if (role === "user") {
    return (
      <View style={styles.userRow}>
        <View
          style={[
            styles.userBubble,
            { backgroundColor: dark ? "#2f2f2f" : "#f0f0f0" },
          ]}
        >
          <Text
            style={[styles.userText, { color: colors.text }]}
          >
            {content}
          </Text>
        </View>
      </View>
    );
  }

  const markdownStyles = {
    body: {
      color: colors.text,
      fontSize: 16,
      lineHeight: 24,
    },
    code_inline: {
      backgroundColor: dark ? "#2f2f2f" : "#f0f0f0",
      color: dark ? "#e5e5e5" : "#1a1a1a",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      fontSize: 14,
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
    fence: {
      backgroundColor: dark ? "#1a1a1a" : "#f4f4f4",
      color: dark ? "#e5e5e5" : "#1a1a1a",
      padding: 12,
      borderRadius: 10,
      fontSize: 14,
      marginVertical: 8,
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
    blockquote: {
      backgroundColor: dark ? "#1a1a1a" : "#f4f4f4",
      borderLeftColor: dark ? "#444" : "#ccc",
      borderLeftWidth: 3,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 4,
      marginVertical: 8,
    },
    link: {
      color: "#10a37f",
    },
    heading1: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "700" as const,
      marginVertical: 8,
    },
    heading2: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "600" as const,
      marginVertical: 6,
    },
    heading3: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "600" as const,
      marginVertical: 4,
    },
    paragraph: {
      marginVertical: 4,
    },
    list_item: {
      marginVertical: 2,
    },
  };

  return (
    <View style={styles.assistantRow}>
      <View style={styles.avatarContainer}>
        <Ionicons name="sparkles" size={14} color="#10a37f" />
      </View>
      <View style={styles.assistantContent}>
        <Markdown
          style={markdownStyles}
          onLinkPress={handleLinkPress}
          rules={{
            fence: (node, _children, _parent, styles) => {
              const code = node.content ?? "";
              return (
                <CodeBlock key={node.key} code={code} style={styles} dark={dark} />
              );
            },
          }}
        >
          {content}
        </Markdown>
        {isStreaming && <View style={styles.cursor} />}
        {!isStreaming && <MessageActions content={content} info={info} />}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  userRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  userBubble: {
    borderRadius: 20,
    borderBottomRightRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: "85%",
  },
  userText: {
    fontSize: 16,
    lineHeight: 22,
  },
  assistantRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 10,
  },
  avatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(16,163,127,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  assistantContent: {
    flex: 1,
  },
  cursor: {
    width: 3,
    height: 20,
    backgroundColor: "#10a37f",
    borderRadius: 2,
    marginLeft: 2,
    opacity: 0.8,
  },
});

const codeBlockStyles = StyleSheet.create({
  copyButton: {
    position: "absolute",
    top: 6,
    right: 6,
    borderRadius: 6,
    padding: 4,
    zIndex: 1,
  },
});
