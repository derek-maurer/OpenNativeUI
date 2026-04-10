import { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import * as Speech from "expo-speech";
import * as Clipboard from "expo-clipboard";
import { useToast } from "@/components/ui/Toast";
import { RetrySheet } from "./RetrySheet";
import {
  parseReasoningSegments,
  hasReasoningContent,
  getThinkingProfile,
  useModelStore,
  type MessageInfo,
} from "@opennative/shared";

interface MessageActionsProps {
  content: string;
  info?: MessageInfo;
  onRetry?: () => void;
}

const SCREEN_HEIGHT = Dimensions.get("window").height;
const ANIM_DURATION = 300;

export function MessageActions({ content, info, onRetry }: MessageActionsProps) {
  const { colors, dark } = useTheme();
  const toast = useToast();
  const [infoVisible, setInfoVisible] = useState(false);
  const [retrySheetVisible, setRetrySheetVisible] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const selectedModelId = useModelStore((s) => s.selectedModelId);

  // Strip out any reasoning/thinking blocks so the copied text matches what
  // the user actually sees as the answer. Falls back to the raw content
  // when the message has no reasoning markers (the fast path).
  const plainContent = useMemo(() => {
    if (!hasReasoningContent(content)) return content;
    const segments = parseReasoningSegments(content);
    if (!segments) return content;
    return segments
      .filter((s) => s.kind === "text")
      .map((s) => (s as { kind: "text"; text: string }).text)
      .join("")
      .trim();
  }, [content]);

  const openSheet = useCallback(() => {
    setInfoVisible(true);
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: ANIM_DURATION,
        useNativeDriver: true,
      }),
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        damping: 20,
        stiffness: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, sheetTranslateY]);

  const closeSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: ANIM_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: ANIM_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => setInfoVisible(false));
  }, [backdropOpacity, sheetTranslateY]);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(plainContent);
    toast.show("Copied to clipboard");
  }, [plainContent, toast]);

  const handleSpeak = useCallback(() => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }

    // Strip markdown syntax for cleaner speech
    const plain = content
      .replace(/```[\s\S]*?```/g, " code block ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/[#*_~>\[\]()!|]/g, "")
      .replace(/\n+/g, " ")
      .trim();

    setIsSpeaking(true);
    Speech.speak(plain, {
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [content, isSpeaking]);

  const handleRetryPress = useCallback(() => {
    if (!onRetry) return;
    const thinkingProfile = getThinkingProfile(selectedModelId);
    if (thinkingProfile) {
      setRetrySheetVisible(true);
    } else {
      onRetry();
    }
  }, [onRetry, selectedModelId]);

  const buttonColor = dark ? "#888" : "#777";

  return (
    <View style={styles.container}>
      {info && (
        <TouchableOpacity
          onPress={openSheet}
          style={styles.button}
          activeOpacity={0.6}
          hitSlop={8}
        >
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={buttonColor}
          />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={handleSpeak}
        style={styles.button}
        activeOpacity={0.6}
        hitSlop={8}
      >
        <Ionicons
          name={isSpeaking ? "stop-circle-outline" : "play-circle-outline"}
          size={18}
          color={isSpeaking ? "#10a37f" : buttonColor}
        />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleCopy}
        style={styles.button}
        activeOpacity={0.6}
        hitSlop={8}
        accessibilityLabel="Copy message"
      >
        <Ionicons name="copy-outline" size={17} color={buttonColor} />
      </TouchableOpacity>

      {onRetry && (
        <TouchableOpacity
          onPress={handleRetryPress}
          style={styles.button}
          activeOpacity={0.6}
          hitSlop={8}
          accessibilityLabel="Retry message"
        >
          <Ionicons name="refresh-outline" size={17} color={buttonColor} />
        </TouchableOpacity>
      )}

      {onRetry && (
        <RetrySheet
          visible={retrySheetVisible}
          onClose={() => setRetrySheetVisible(false)}
          onRetry={() => {
            setRetrySheetVisible(false);
            onRetry();
          }}
          modelId={selectedModelId}
        />
      )}

      {info && (
        <Modal
          visible={infoVisible}
          transparent
          animationType="none"
          onRequestClose={closeSheet}
        >
          <View style={styles.overlay}>
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                styles.backdrop,
                { opacity: backdropOpacity },
              ]}
            >
              <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
            </Animated.View>

            <Animated.View
              style={[
                styles.sheet,
                { backgroundColor: dark ? "#1e1e1e" : "#fff" },
                { transform: [{ translateY: sheetTranslateY }] },
              ]}
            >
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                Message Info
              </Text>

              <InfoRow
                label="Model"
                value={info.model}
                color={colors.text}
                dimColor={buttonColor}
              />
              <InfoRow
                label="Output tokens"
                value={`~${info.outputTokens}`}
                color={colors.text}
                dimColor={buttonColor}
              />
              <InfoRow
                label="Duration"
                value={`${info.totalDuration.toFixed(1)}s`}
                color={colors.text}
                dimColor={buttonColor}
              />
              <InfoRow
                label="Tokens/sec"
                value={info.tokensPerSecond.toFixed(1)}
                color={colors.text}
                dimColor={buttonColor}
              />

              <TouchableOpacity
                onPress={closeSheet}
                style={[
                  styles.closeButton,
                  { backgroundColor: dark ? "#333" : "#f0f0f0" },
                ]}
              >
                <Text style={{ color: colors.text, fontWeight: "600" }}>
                  Close
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function InfoRow({
  label,
  value,
  color,
  dimColor,
}: {
  label: string;
  value: string;
  color: string;
  dimColor: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: dimColor }]}>{label}</Text>
      <Text style={[styles.infoValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
  },
  button: {
    padding: 2,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
});
