import { useEffect, type ReactNode } from "react";
import {
  View,
  Pressable,
  Modal,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";

const DURATION = 300;
const EASING = Easing.out(Easing.cubic);

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  backgroundColor?: string;
  maxHeight?: string | number;
}

export function BottomSheet({
  visible,
  onClose,
  children,
  backgroundColor = "#fff",
  maxHeight = "70%",
}: BottomSheetProps) {
  const { height: screenHeight } = useWindowDimensions();
  const translateY = useSharedValue(screenHeight);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: DURATION, easing: EASING });
      backdropOpacity.value = withTiming(1, {
        duration: DURATION,
        easing: EASING,
      });
    }
  }, [visible]);

  const dismiss = () => {
    translateY.value = withTiming(
      screenHeight,
      { duration: DURATION, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onClose)();
      }
    );
    backdropOpacity.value = withTiming(0, {
      duration: DURATION,
      easing: Easing.in(Easing.cubic),
    });
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor, maxHeight: maxHeight as any },
            sheetStyle,
          ]}
        >
          <View style={styles.handle} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#737373",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 12,
  },
});
