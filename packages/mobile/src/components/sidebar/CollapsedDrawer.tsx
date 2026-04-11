import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";

interface CollapsedDrawerProps {
  onExpand: () => void;
  onNewChat: () => void;
  onOpenFolders: () => void;
  onOpenSettings: () => void;
}

export function CollapsedDrawer({
  onExpand,
  onNewChat,
  onOpenFolders,
  onOpenSettings,
}: CollapsedDrawerProps) {
  const { colors, dark } = useTheme();
  const bgColor = dark ? "#0d0d0d" : "#f9f9f9";
  const iconBtnBg = dark ? "#2a2a2a" : "#e5e5e5";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: bgColor }]}
      edges={["top", "bottom"]}
    >
      {/* Expand button */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={onExpand}
          style={[styles.iconButton, { backgroundColor: iconBtnBg }]}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </Pressable>
      </View>

      {/* Action icons */}
      <View style={styles.body}>
        <Pressable
          onPress={onNewChat}
          style={[styles.iconButton, { backgroundColor: iconBtnBg }]}
        >
          <Ionicons name="create-outline" size={20} color={colors.text} />
        </Pressable>
        <Pressable
          onPress={onOpenFolders}
          style={[styles.iconButton, { backgroundColor: iconBtnBg }]}
        >
          <Ionicons name="folder-outline" size={20} color={colors.text} />
        </Pressable>
      </View>

      {/* Settings */}
      <Pressable
        onPress={onOpenSettings}
        style={[styles.footer, { borderTopColor: colors.border }]}
      >
        <Ionicons name="settings-outline" size={20} color={colors.text} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  body: {
    flex: 1,
    alignItems: "center",
    paddingTop: 12,
    gap: 8,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
