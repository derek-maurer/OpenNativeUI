import { memo, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import Markdown from "react-native-markdown-display";
import {
  cleanReasoningText,
  formatDuration,
  type ReasoningEntry,
} from "@opennative/shared";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ThinkingBlockProps {
  entry: ReasoningEntry;
  /**
   * True while the assistant message that owns this block is still
   * streaming. Individual reasoning entries also carry their own `isDone`
   * flag — the header treats a block as in-progress when EITHER the
   * streaming flag is set OR the entry itself isn't done yet.
   */
  isStreaming?: boolean;
}

/**
 * Collapsible "Thinking…" / "Thought for X seconds" widget.
 *
 * Mirrors the behaviour of conduit's ReasoningTile + MarkdownDetailsBlock,
 * which in turn mirror Open WebUI's Collapsible.svelte: show a shimmer
 * while the model is reasoning, then collapse to a humanised duration
 * label once the `<details>` block closes. Tap the header to reveal the
 * reasoning text (rendered as markdown so blockquote/formatting are
 * preserved).
 */
export const ThinkingBlock = memo(function ThinkingBlock({
  entry,
  isStreaming,
}: ThinkingBlockProps) {
  const { colors, dark } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const inProgress = isStreaming === true || !entry.isDone;
  const cleanedReasoning = cleanReasoningText(entry.reasoning);
  const isCodeInterpreter = entry.blockType === "code_interpreter";

  const headerTitle = (() => {
    if (entry.summary && !inProgress) {
      // Prefer the server-provided summary when the block is complete —
      // it often includes the duration already (e.g. "Thought for 12
      // seconds"). During streaming we ignore it so we can show our own
      // animated "Thinking…" label.
      return entry.summary;
    }
    if (isCodeInterpreter) {
      return inProgress ? "Analyzing…" : "Analyzed";
    }
    if (inProgress) return "Thinking…";
    if (entry.duration > 0) {
      return `Thought for ${formatDuration(entry.duration)}`;
    }
    return "Thought";
  })();

  // Pulsing opacity animation for the header label while reasoning is
  // still streaming. We don't need a full shimmer effect — a gentle fade
  // reads as "active thinking" without the visual noise.
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!inProgress) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [inProgress, pulse]);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  const surfaceColor = dark ? "#1a1a1a" : "#f4f4f4";
  const borderColor = dark ? "#2a2a2a" : "#e5e5e5";
  const mutedTextColor = dark ? "#9a9a9a" : "#5f5f5f";
  const iconColor = dark ? "#b5b5b5" : "#555";

  const markdownStyles = {
    body: {
      color: mutedTextColor,
      fontSize: 14,
      lineHeight: 20,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 6,
    },
    code_inline: {
      backgroundColor: dark ? "#2f2f2f" : "#eaeaea",
      color: colors.text,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 4,
      fontSize: 13,
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
    fence: {
      backgroundColor: dark ? "#111" : "#ececec",
      color: colors.text,
      padding: 8,
      borderRadius: 6,
      fontSize: 13,
      marginVertical: 6,
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
    blockquote: {
      backgroundColor: "transparent",
      borderLeftColor: dark ? "#3a3a3a" : "#d0d0d0",
      borderLeftWidth: 2,
      paddingHorizontal: 8,
      marginVertical: 4,
    },
  } as const;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: surfaceColor, borderColor },
      ]}
    >
      <TouchableOpacity
        onPress={toggleExpanded}
        activeOpacity={0.7}
        style={styles.header}
        accessibilityRole="button"
        accessibilityLabel={`${headerTitle}. Tap to ${expanded ? "collapse" : "expand"}.`}
      >
        <Ionicons
          name={isCodeInterpreter ? "terminal-outline" : "bulb-outline"}
          size={16}
          color={iconColor}
          style={styles.icon}
        />
        <Animated.Text
          style={[
            styles.headerText,
            { color: mutedTextColor, opacity: inProgress ? pulse : 1 },
          ]}
          numberOfLines={1}
        >
          {headerTitle}
        </Animated.Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={iconColor}
        />
      </TouchableOpacity>
      {expanded && cleanedReasoning.length > 0 && (
        <View style={[styles.body, { borderTopColor: borderColor }]}>
          <Markdown style={markdownStyles}>{cleanedReasoning}</Markdown>
        </View>
      )}
      {expanded && cleanedReasoning.length === 0 && (
        <View style={[styles.body, { borderTopColor: borderColor }]}>
          <Text style={[styles.placeholder, { color: mutedTextColor }]}>
            {inProgress
              ? "Waiting for the model to start reasoning…"
              : "No reasoning content."}
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginVertical: 6,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  icon: {
    marginRight: 2,
  },
  headerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  body: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  placeholder: {
    fontSize: 13,
    fontStyle: "italic",
  },
});
