import { memo, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { useTheme } from "@react-navigation/native";
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
  isStreaming?: boolean;
}

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
    if (entry.summary && !inProgress) return entry.summary;
    if (isCodeInterpreter) return inProgress ? "Analyzing…" : "Analyzed";
    if (inProgress) return "Thinking…";
    if (entry.duration > 0) return `Thought for ${formatDuration(entry.duration)}`;
    return "Thought";
  })();

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
    return () => loop.stop();
  }, [inProgress, pulse]);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  const surfaceColor = dark ? "#1a1a1a" : "#f4f4f4";
  const borderColor = dark ? "#2a2a2a" : "#e5e5e5";
  const mutedTextColor = dark ? "#c8c8c8" : "#5f5f5f";
  const codeSurfaceColor = dark ? "#252525" : "#ececec";
  const codeBorderColor = dark ? "#333" : "#dcdcdc";

  const markdownStyles = {
    body: { color: mutedTextColor, fontSize: 14, lineHeight: 20 },
    paragraph: { marginTop: 0, marginBottom: 6 },
    code_inline: {
      backgroundColor: codeSurfaceColor,
      borderColor: codeBorderColor,
      borderWidth: StyleSheet.hairlineWidth,
      color: mutedTextColor,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 4,
      fontSize: 13,
      fontFamily: "Menlo",
    },
    fence: {
      backgroundColor: codeSurfaceColor,
      borderColor: codeBorderColor,
      borderWidth: StyleSheet.hairlineWidth,
      color: mutedTextColor,
      padding: 8,
      borderRadius: 6,
      fontSize: 13,
      marginVertical: 6,
      fontFamily: "Menlo",
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
    <View style={[styles.container, { backgroundColor: surfaceColor, borderColor }]}>
      <TouchableOpacity
        onPress={toggleExpanded}
        activeOpacity={0.7}
        style={styles.header}
      >
        <Text style={[styles.icon, { color: mutedTextColor }]}>
          {isCodeInterpreter ? "⌨" : "💡"}
        </Text>
        <Animated.Text
          style={[styles.headerText, { color: mutedTextColor, opacity: inProgress ? pulse : 1 }]}
          numberOfLines={1}
        >
          {headerTitle}
        </Animated.Text>
        <Text style={[styles.chevron, { color: mutedTextColor }]}>
          {expanded ? "▴" : "▾"}
        </Text>
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
  icon: { fontSize: 15 },
  headerText: { flex: 1, fontSize: 14, fontWeight: "500" },
  chevron: { fontSize: 13 },
  body: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  placeholder: { fontSize: 13, fontStyle: "italic" },
});
