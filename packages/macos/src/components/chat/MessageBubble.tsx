import { memo, useCallback, useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  Clipboard,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { useTheme } from "@react-navigation/native";
import { MessageSources, flattenCitations } from "./MessageSources";
import { ThinkingBlock } from "./ThinkingBlock";
import {
  hasReasoningContent,
  parseReasoningSegments,
  type MessageInfo,
  type AttachedFile,
  type MessageSource,
  type ReasoningSegment,
} from "@opennative/shared";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  isStreaming?: boolean;
  info?: MessageInfo;
  files?: AttachedFile[];
  sources?: MessageSource[];
}

function CodeBlock({ code, style, dark }: { code: string; style: any; dark: boolean }) {
  const handleCopy = useCallback(() => {
    try {
      Clipboard.setString(code);
    } catch {
      // Clipboard may not be available; user can select text natively on macOS
    }
  }, [code]);

  return (
    <View style={[style.fence, { position: "relative" as const }]}>
      <TouchableOpacity
        onPress={handleCopy}
        style={[styles.copyButton, { backgroundColor: dark ? "#333" : "#e0e0e0" }]}
        activeOpacity={0.7}
      >
        <Text style={{ color: dark ? "#aaa" : "#555", fontSize: 11 }}>Copy</Text>
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
  files,
  sources,
}: MessageBubbleProps) {
  const { colors, dark } = useTheme();
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});

  const citations = useMemo(() => flattenCitations(sources), [sources]);

  const segments = useMemo<ReasoningSegment[] | null>(() => {
    if (role !== "assistant") return null;
    if (!hasReasoningContent(content)) return null;
    return parseReasoningSegments(content);
  }, [content, role]);

  const imageFiles = files?.filter((f) => f.mimeType?.startsWith("image/")) ?? [];

  const markdownStyles = {
    body: { color: colors.text, fontSize: 15, lineHeight: 23 },
    code_inline: {
      backgroundColor: dark ? "#2f2f2f" : "#f0f0f0",
      color: dark ? "#e5e5e5" : "#1a1a1a",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      fontSize: 13,
      fontFamily: "Menlo",
    },
    fence: {
      backgroundColor: dark ? "#1a1a1a" : "#f4f4f4",
      color: dark ? "#e5e5e5" : "#1a1a1a",
      padding: 12,
      borderRadius: 10,
      fontSize: 13,
      marginVertical: 8,
      fontFamily: "Menlo",
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
    link: { color: "#10a37f" },
    heading1: { color: colors.text, fontSize: 20, fontWeight: "700" as const, marginVertical: 8 },
    heading2: { color: colors.text, fontSize: 18, fontWeight: "600" as const, marginVertical: 6 },
    heading3: { color: colors.text, fontSize: 16, fontWeight: "600" as const, marginVertical: 4 },
    paragraph: { marginVertical: 4 },
    list_item: { marginVertical: 2 },
  };

  const markdownRules = {
    fence: (node: any, _children: any, _parent: any, styles: any) => (
      <CodeBlock key={node.key} code={node.content ?? ""} style={styles} dark={dark} />
    ),
    text: (node: any, _children: any, _parent: any, styles: any, inheritedStyles: any = {}) => {
      const text: string = node.content ?? "";
      if (citations.length === 0 || !text.includes("[")) {
        return <Text key={node.key} style={[inheritedStyles, styles.text]}>{text}</Text>;
      }
      const parts: ReactNode[] = [];
      const matches = Array.from(text.matchAll(/\[(\d+)\]/g));
      let cursor = 0;
      matches.forEach((m, idx) => {
        const start = m.index ?? 0;
        if (start > cursor) parts.push(text.slice(cursor, start));
        const n = parseInt(m[1], 10);
        const citation = citations[n - 1];
        if (citation) {
          parts.push(
            <Text
              key={`cite-${node.key}-${idx}`}
              style={[inheritedStyles, citationStyles.citation]}
              accessibilityRole="link"
            >
              [{n}]
            </Text>,
          );
        } else {
          parts.push(m[0]);
        }
        cursor = start + m[0].length;
      });
      if (cursor < text.length) parts.push(text.slice(cursor));
      return <Text key={node.key} style={[inheritedStyles, styles.text]}>{parts}</Text>;
    },
  };

  const renderMarkdown = (body: string, key?: string) => (
    <Markdown key={key} style={markdownStyles} rules={markdownRules}>
      {body}
    </Markdown>
  );

  if (role === "user") {
    return (
      <View style={styles.userRow}>
        <View
          style={[
            styles.userBubble,
            { backgroundColor: dark ? "#2f2f2f" : "#f0f0f0" },
            imageFiles.length > 0 && styles.userBubbleWithImages,
          ]}
        >
          {imageFiles.length > 0 && (
            <View style={styles.imageGrid}>
              {imageFiles.map((f) => (
                <Image
                  key={f.id}
                  source={{ uri: f.dataUrl ?? f.uri }}
                  style={[styles.inlineImage, { aspectRatio: aspectRatios[f.id] ?? 1 }]}
                  onLoad={(e) => {
                    const src = e.nativeEvent.source;
                    if (src?.width && src?.height) {
                      setAspectRatios((prev) =>
                        prev[f.id] ? prev : { ...prev, [f.id]: src.width / src.height },
                      );
                    }
                  }}
                />
              ))}
            </View>
          )}
          {content.length > 0 && (
            <Text style={[styles.userText, { color: colors.text }]}>{content}</Text>
          )}
        </View>
      </View>
    );
  }

  let bodyContent: ReactNode;
  if (segments && segments.length > 0) {
    bodyContent = segments.map((segment, idx) => {
      if (segment.kind === "reasoning") {
        return <ThinkingBlock key={`reasoning-${idx}`} entry={segment.entry} isStreaming={isStreaming} />;
      }
      return renderMarkdown(segment.text, `text-${idx}`);
    });
  } else {
    bodyContent = renderMarkdown(content);
  }

  return (
    <View style={styles.assistantRow}>
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarIcon}>✦</Text>
      </View>
      <View style={styles.assistantContent}>
        {bodyContent}
        {isStreaming && <View style={styles.cursor} />}
        {!isStreaming && <MessageSources citations={citations} />}
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
    borderRadius: 18,
    borderBottomRightRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: "75%",
  },
  userBubbleWithImages: { width: "75%", paddingHorizontal: 4, paddingVertical: 4, overflow: "hidden" },
  imageGrid: { gap: 4, marginBottom: 4 },
  inlineImage: { width: "100%", borderRadius: 14 },
  userText: { fontSize: 15, lineHeight: 22 },
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
  avatarIcon: { fontSize: 12, color: "#10a37f" },
  assistantContent: { flex: 1 },
  cursor: {
    width: 3,
    height: 20,
    backgroundColor: "#10a37f",
    borderRadius: 2,
    marginLeft: 2,
    opacity: 0.8,
  },
  copyButton: {
    position: "absolute",
    top: 6,
    right: 6,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    zIndex: 1,
  },
});

const citationStyles = StyleSheet.create({
  citation: { color: "#10a37f", fontWeight: "600" },
});
