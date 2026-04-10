import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import type { StreamingStatus } from "@opennative/shared";

function Dot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 })
        ),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <ReAnimated.View style={[styles.dot, animatedStyle]} />;
}

/**
 * Shimmer label — pulses the text opacity between dim and bright in a wave
 * pattern. Uses Animated (not Reanimated) so we can use `useNativeDriver`.
 */
function ShimmerLabel({ text }: { text: string }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 1],
  });

  return (
    <Animated.Text style={[styles.historyLabel, { opacity }]}>
      {text}
    </Animated.Text>
  );
}

interface TypingIndicatorProps {
  statusHistory?: StreamingStatus[];
}

export function TypingIndicator({ statusHistory }: TypingIndicatorProps) {
  const visibleHistory = statusHistory?.filter((s) => s.description) ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.avatar} />
      <View style={styles.content}>
        <View style={styles.dotsContainer}>
          <Dot delay={0} />
          <Dot delay={200} />
          <Dot delay={400} />
        </View>
        {visibleHistory.map((entry, i) =>
          entry.done ? (
            <Text key={entry.action ?? i} style={styles.historyLabelDone}>
              {entry.description}
            </Text>
          ) : (
            <ShimmerLabel key={entry.action ?? i} text={entry.description} />
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(16,163,127,0.12)",
  },
  content: {
    flex: 1,
    gap: 4,
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#737373",
  },
  historyLabel: {
    fontSize: 12,
    color: "#a3a3a3",
    flexShrink: 1,
    flexWrap: "wrap",
    paddingLeft: 12,
  },
  historyLabelDone: {
    fontSize: 12,
    color: "#525252",
    flexShrink: 1,
    flexWrap: "wrap",
    paddingLeft: 12,
  },
});
