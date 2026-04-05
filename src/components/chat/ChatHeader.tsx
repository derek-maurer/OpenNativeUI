import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { ModelSelector } from "./ModelSelector";

interface ChatHeaderProps {
  onMenuPress: () => void;
}

export function ChatHeader({ onMenuPress }: ChatHeaderProps) {
  const router = useRouter();
  const { dark, colors } = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <Pressable
        onPress={onMenuPress}
        style={{ ...styles.iconButton, backgroundColor: dark ? "#2a2a2a" : "#e5e5e5" }}
      >
        <Ionicons name="menu" size={20} color={colors.text} />
      </Pressable>

      <ModelSelector />

      <Pressable
        onPress={() => {
          router.replace("/(app)");
        }}
        style={{ ...styles.iconButton, backgroundColor: dark ? "#2a2a2a" : "#e5e5e5" }}
      >
        <Ionicons name="create-outline" size={20} color={colors.text} />
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
