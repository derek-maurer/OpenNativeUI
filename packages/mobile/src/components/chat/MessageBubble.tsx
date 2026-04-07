import { memo, useCallback, useMemo, type ReactNode } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import { useTheme } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import * as Clipboard from "expo-clipboard";
import { useToast } from "@/components/ui/Toast";
import { MessageActions } from "./MessageActions";
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
  files,
  sources,
}: MessageBubbleProps) {
  const { colors, dark } = useTheme();

  const handleLinkPress = useCallback((url: string) => {
    WebBrowser.openBrowserAsync(url, {
      dismissButtonStyle: "close",
    });
    return false;
  }, []);

  const openCitation = useCallback((url: string) => {
    WebBrowser.openBrowserAsync(url, {
      dismissButtonStyle: "close",
    });
  }, []);

  const citations = useMemo(() => flattenCitations(sources), [sources]);

  // Split assistant content into ordered text + reasoning segments so a
  // `<details type="reasoning">` block embedded by the backend can render
  // as a collapsible ThinkingBlock instead of leaking raw HTML into the
  // markdown renderer. Messages that have no reasoning markers skip the
  // segmenter entirely and fall through to the single-Markdown fast path.
  const segments = useMemo<ReasoningSegment[] | null>(() => {
    if (role !== "assistant") return null;
    if (!hasReasoningContent(content)) return null;
    return parseReasoningSegments(content);
  }, [content, role]);

  const imageFiles = files?.filter((f) => f.mimeType?.startsWith("image/")) ?? [];

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
                  style={[
                    styles.inlineImage,
                    imageFiles.length === 1 && styles.inlineImageSingle,
                  ]}
                />
              ))}
            </View>
          )}
          {content.length > 0 && (
            <Text
              style={[
                styles.userText,
                { color: colors.text },
                imageFiles.length > 0 && { paddingHorizontal: 12, paddingVertical: 4 },
              ]}
            >
              {content}
            </Text>
          )}
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

  const markdownRules = {
    fence: (node: any, _children: any, _parent: any, styles: any) => {
      const code = node.content ?? "";
      return (
        <CodeBlock key={node.key} code={code} style={styles} dark={dark} />
      );
    },
    // Override the leaf text rule to rewrite `[N]` tokens into
    // pressable spans wired to the citation URL. We must preserve
    // `inheritedStyles` so text inside bold/italic/list-item still
    // picks up its ancestor styling. Tokens without a matching
    // citation (or whose source has no URL) fall through as plain
    // text. The fast-path bails out when there are no citations or
    // the text contains no `[` at all.
    text: (
      node: any,
      _children: any,
      _parent: any,
      styles: any,
      inheritedStyles: any = {},
    ) => {
      const text: string = node.content ?? "";
      if (citations.length === 0 || !text.includes("[")) {
        return (
          <Text key={node.key} style={[inheritedStyles, styles.text]}>
            {text}
          </Text>
        );
      }

      const parts: ReactNode[] = [];
      const matches = Array.from(text.matchAll(/\[(\d+)\]/g));
      let cursor = 0;
      matches.forEach((m, idx) => {
        const start = m.index ?? 0;
        if (start > cursor) {
          parts.push(text.slice(cursor, start));
        }
        const n = parseInt(m[1], 10);
        const citation = citations[n - 1];
        if (citation) {
          parts.push(
            <Text
              key={`cite-${node.key}-${idx}`}
              style={[inheritedStyles, citationStyles.citation]}
              onPress={() => openCitation(citation.url)}
              accessibilityRole="link"
              accessibilityLabel={`Source ${n}: ${citation.title}`}
            >
              [{n}]
            </Text>,
          );
        } else {
          parts.push(m[0]);
        }
        cursor = start + m[0].length;
      });

      if (cursor < text.length) {
        parts.push(text.slice(cursor));
      }

      return (
        <Text key={node.key} style={[inheritedStyles, styles.text]}>
          {parts}
        </Text>
      );
    },
  };

  const renderMarkdown = (body: string, key?: string) => (
    <Markdown
      key={key}
      style={markdownStyles}
      onLinkPress={handleLinkPress}
      rules={markdownRules}
    >
      {body}
    </Markdown>
  );

  // Assistant body: either the plain markdown fast path, or an ordered
  // list of text-and-reasoning segments when the message contains
  // `<details type="reasoning">` blocks. We keep each ThinkingBlock
  // inline so reasoning that happens mid-response (e.g. a model that
  // thinks, answers, then thinks again) renders in the right order.
  let bodyContent: ReactNode;
  if (segments && segments.length > 0) {
    bodyContent = segments.map((segment, idx) => {
      if (segment.kind === "reasoning") {
        return (
          <ThinkingBlock
            key={`reasoning-${idx}`}
            entry={segment.entry}
            isStreaming={isStreaming}
          />
        );
      }
      return renderMarkdown(segment.text, `text-${idx}`);
    });
  } else {
    bodyContent = renderMarkdown(content);
  }

  return (
    <View style={styles.assistantRow}>
      <View style={styles.avatarContainer}>
        <Ionicons name="sparkles" size={14} color="#10a37f" />
      </View>
      <View style={styles.assistantContent}>
        {bodyContent}
        {isStreaming && <View style={styles.cursor} />}
        {!isStreaming && (
          <>
            <MessageSources citations={citations} />
            <MessageActions content={content} info={info} />
          </>
        )}
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
  userBubbleWithImages: {
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 4,
    overflow: "hidden",
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 4,
  },
  inlineImage: {
    width: 120,
    height: 120,
    borderRadius: 16,
  },
  inlineImageSingle: {
    width: 200,
    height: 200,
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

const citationStyles = StyleSheet.create({
  citation: {
    color: "#10a37f",
    fontWeight: "600",
  },
});
