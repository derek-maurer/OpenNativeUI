import { View, Text, Pressable, Alert, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";

import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useConversationStore } from "@/stores/conversationStore";
import { useChatStore } from "@/stores/chatStore";

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Ionicons
        name={icon}
        size={20}
        color={destructive ? "#ef4444" : colors.text}
      />
      <Text
        style={[
          styles.rowLabel,
          { color: destructive ? "#ef4444" : colors.text },
        ]}
      >
        {label}
      </Text>
      {value ? (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={18} color="#525252" />
      ) : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, dark } = useTheme();

  const serverUrl = useAuthStore((s) => s.serverUrl);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const clearAll = useConversationStore((s) => s.clearAll);
  const clearChat = useChatStore((s) => s.clearChat);

  const themeLabel =
    theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light";

  const handleThemeChange = () => {
    Alert.alert("Theme", "Select a theme:", [
      { text: "System", onPress: () => setTheme("system") },
      { text: "Light", onPress: () => setTheme("light") },
      { text: "Dark", onPress: () => setTheme("dark") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleClearHistory = () => {
    Alert.alert(
      "Clear History",
      "This will delete all conversations and messages. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            clearChat();
            await clearAll();
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "You'll need to sign in again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => {
            clearChat();
            logout();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={{ padding: 6 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Settings
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingVertical: 24 }}>
        {/* Appearance */}
        <Text style={styles.sectionTitle}>APPEARANCE</Text>
        <View
          style={[
            styles.section,
            { backgroundColor: dark ? "#141414" : "#f5f5f5" },
          ]}
        >
          <SettingsRow
            icon="color-palette-outline"
            label="Theme"
            value={themeLabel}
            onPress={handleThemeChange}
          />
        </View>

        {/* Server */}
        <Text style={styles.sectionTitle}>SERVER</Text>
        <View
          style={[
            styles.section,
            { backgroundColor: dark ? "#141414" : "#f5f5f5" },
          ]}
        >
          <SettingsRow icon="server-outline" label="Server URL" value={serverUrl} />
          <View
            style={[styles.divider, { backgroundColor: colors.border }]}
          />
          <SettingsRow icon="person-outline" label="Account" value={user?.email ?? "—"} />
        </View>

        {/* Data */}
        <Text style={styles.sectionTitle}>DATA</Text>
        <View
          style={[
            styles.section,
            { backgroundColor: dark ? "#141414" : "#f5f5f5" },
          ]}
        >
          <SettingsRow
            icon="trash-outline"
            label="Clear Conversation History"
            onPress={handleClearHistory}
            destructive
          />
        </View>

        {/* Account */}
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View
          style={[
            styles.section,
            { backgroundColor: dark ? "#141414" : "#f5f5f5" },
          ]}
        >
          <SettingsRow
            icon="log-out-outline"
            label="Sign Out"
            onPress={handleSignOut}
            destructive
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>OpenNativeUI v1.0.0</Text>
          <Text style={styles.footerText}>Powered by Open WebUI</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#737373",
    letterSpacing: 0.6,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 8,
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
  },
  rowValue: {
    fontSize: 14,
    color: "#737373",
    maxWidth: 180,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48,
  },
  footer: {
    alignItems: "center",
    marginTop: 32,
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: "#525252",
  },
});
