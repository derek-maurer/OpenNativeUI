import { View, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { ModelSelector } from "./ModelSelector";

interface ChatHeaderProps {
  onMenuPress: () => void;
}

export function ChatHeader({ onMenuPress }: ChatHeaderProps) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <Pressable onPress={onMenuPress} style={styles.iconButton}>
        <Ionicons name="menu" size={24} color={colors.text} />
      </Pressable>

      <ModelSelector />

      <Pressable
        onPress={() => {
          router.replace("/(app)");
        }}
        style={styles.iconButton}
      >
        <Ionicons name="create-outline" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconButton: {
    padding: 6,
  },
});
