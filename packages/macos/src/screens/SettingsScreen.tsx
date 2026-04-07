import { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";

import {
  disconnectSocket,
  useAuthStore,
  useChatStore,
  useConversationStore,
  useModelStore,
  useSettingsStore,
} from "@opennative/shared";

interface SettingsScreenProps {
  onClose: () => void;
}

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  destructive,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.row} disabled={!onPress && !value}>
      <Text style={[styles.rowIcon, { color: destructive ? "#ef4444" : "#737373" }]}>{icon}</Text>
      <Text style={[styles.rowLabel, { color: destructive ? "#ef4444" : colors.text }]}>
        {label}
      </Text>
      {value ? (
        <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
      ) : onPress ? (
        <Text style={[styles.rowChevron, { color: "#525252" }]}>›</Text>
      ) : null}
    </Pressable>
  );
}

export function SettingsScreen({ onClose }: SettingsScreenProps) {
  const { colors, dark } = useTheme();
  const [modelPickerVisible, setModelPickerVisible] = useState(false);

  const serverUrl = useAuthStore((s) => s.serverUrl);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const models = useModelStore((s) => s.models);
  const defaultModelId = useModelStore((s) => s.defaultModelId);
  const setDefaultModel = useModelStore((s) => s.setDefaultModel);
  const webSearchByDefault = useSettingsStore((s) => s.webSearchByDefault);
  const setWebSearchByDefault = useSettingsStore((s) => s.setWebSearchByDefault);
  const clearAll = useConversationStore((s) => s.clearAll);
  const clearChat = useChatStore((s) => s.clearChat);

  const defaultModel = models.find((m) => m.id === defaultModelId);
  const defaultModelLabel = defaultModel?.name ?? defaultModel?.id ?? "None";
  const themeLabel = theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light";

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
      "This will delete all conversations. This cannot be undone.",
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
      ],
    );
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "You'll need to sign in again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          clearChat();
          disconnectSocket();
          logout();
        },
      },
    ]);
  };

  const sectionBg = dark ? "#141414" : "#f5f5f5";
  const overlayBg = dark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.4)";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Text style={[styles.closeButtonText, { color: colors.text }]}>✕</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Appearance */}
        <Text style={styles.sectionTitle}>APPEARANCE</Text>
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <SettingsRow icon="🎨" label="Theme" value={themeLabel} onPress={handleThemeChange} />
        </View>

        {/* Chat */}
        <Text style={styles.sectionTitle}>CHAT</Text>
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <SettingsRow
            icon="🤖"
            label="Default Model"
            value={defaultModelLabel}
            onPress={() => setModelPickerVisible(true)}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.row}>
            <Text style={[styles.rowIcon, { color: "#737373" }]}>🔍</Text>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Web Search by Default</Text>
            <Switch
              value={webSearchByDefault}
              onValueChange={setWebSearchByDefault}
              trackColor={{ false: "#525252", true: "#10a37f" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Server */}
        <Text style={styles.sectionTitle}>SERVER</Text>
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <SettingsRow icon="🖥" label="Server URL" value={serverUrl} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsRow icon="👤" label="Account" value={user?.email ?? "—"} />
        </View>

        {/* Data */}
        <Text style={styles.sectionTitle}>DATA</Text>
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <SettingsRow
            icon="🗑"
            label="Clear Conversation History"
            onPress={handleClearHistory}
            destructive
          />
        </View>

        {/* Account */}
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <SettingsRow icon="→" label="Sign Out" onPress={handleSignOut} destructive />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>OpenNativeUI for macOS</Text>
          <Text style={styles.footerText}>Powered by Open WebUI</Text>
        </View>
      </ScrollView>

      {/* Model picker overlay — Modal native component not supported on macOS Fabric */}
      {modelPickerVisible && (
        <Pressable
          style={[StyleSheet.absoluteFillObject, styles.overlay, { backgroundColor: overlayBg }]}
          onPress={() => setModelPickerVisible(false)}
        >
          <Pressable
            style={[styles.pickerSheet, { backgroundColor: dark ? "#1a1a1a" : "#fff" }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Default Model</Text>
            </View>
            <FlatList
              data={models}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 400 }}
              contentContainerStyle={{ paddingBottom: 8 }}
              ListHeaderComponent={
                <Pressable
                  onPress={() => { setDefaultModel(null); setModelPickerVisible(false); }}
                  style={[styles.modelRow, !defaultModelId && { backgroundColor: "rgba(16,163,127,0.1)" }]}
                >
                  <Text style={[styles.modelName, { color: !defaultModelId ? "#10a37f" : colors.text }, !defaultModelId && { fontWeight: "600" }]}>
                    None
                  </Text>
                  {!defaultModelId && <Text style={styles.checkmark}>✓</Text>}
                </Pressable>
              }
              renderItem={({ item }) => {
                const isSelected = item.id === defaultModelId;
                return (
                  <Pressable
                    onPress={() => { setDefaultModel(item.id); setModelPickerVisible(false); }}
                    style={[styles.modelRow, isSelected && { backgroundColor: "rgba(16,163,127,0.1)" }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modelName, { color: isSelected ? "#10a37f" : colors.text }, isSelected && { fontWeight: "600" }]} numberOfLines={1}>
                        {item.name || item.id}
                      </Text>
                      {item.owned_by ? <Text style={styles.modelOwner}>{item.owned_by}</Text> : null}
                    </View>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  closeButtonText: { fontSize: 18 },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  scrollContent: { paddingVertical: 20, maxWidth: 600, alignSelf: "center", width: "100%" },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#737373",
    letterSpacing: 0.6,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 8,
  },
  section: { marginHorizontal: 16, borderRadius: 12, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowIcon: { fontSize: 16, width: 22, textAlign: "center" },
  rowLabel: { flex: 1, fontSize: 15 },
  rowValue: { fontSize: 13, color: "#737373", maxWidth: 200 },
  rowChevron: { fontSize: 20 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 50 },
  footer: { alignItems: "center", marginTop: 32, gap: 4, paddingBottom: 20 },
  footerText: { fontSize: 12, color: "#525252" },
  overlay: { flex: 1, alignItems: "center", justifyContent: "center" },
  pickerSheet: {
    width: 360,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  pickerHeader: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  pickerTitle: { fontSize: 16, fontWeight: "600" },
  modelRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  modelName: { fontSize: 14 },
  modelOwner: { fontSize: 12, color: "#737373", marginTop: 2 },
  checkmark: { color: "#10a37f", fontSize: 16, fontWeight: "600" },
});
