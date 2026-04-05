import { View, Text, Pressable, FlatList, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";

import { useConversationStore } from "@/stores/conversationStore";
import { useChatStore } from "@/stores/chatStore";
import { ConversationItem } from "./ConversationItem";
import type { Conversation } from "@/lib/types";

function groupByDate(conversations: Conversation[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  const yesterdayMs = todayMs - 86400000;
  const weekAgoMs = todayMs - 7 * 86400000;

  const groups: { title: string; data: Conversation[] }[] = [];
  const todayItems: Conversation[] = [];
  const yesterdayItems: Conversation[] = [];
  const weekItems: Conversation[] = [];
  const olderItems: Conversation[] = [];

  for (const conv of conversations) {
    if (conv.updatedAt >= todayMs) todayItems.push(conv);
    else if (conv.updatedAt >= yesterdayMs) yesterdayItems.push(conv);
    else if (conv.updatedAt >= weekAgoMs) weekItems.push(conv);
    else olderItems.push(conv);
  }

  if (todayItems.length) groups.push({ title: "Today", data: todayItems });
  if (yesterdayItems.length)
    groups.push({ title: "Yesterday", data: yesterdayItems });
  if (weekItems.length)
    groups.push({ title: "Previous 7 Days", data: weekItems });
  if (olderItems.length) groups.push({ title: "Older", data: olderItems });

  return groups;
}

export function ConversationList(props: DrawerContentComponentProps) {
  const router = useRouter();
  const { colors, dark } = useTheme();
  const conversations = useConversationStore((s) => s.conversations);
  const currentConversationId = useChatStore((s) => s.currentConversationId);
  const clearChat = useChatStore((s) => s.clearChat);

  const groups = groupByDate(conversations);

  const handleNewChat = () => {
    clearChat();
    router.replace("/(app)");
    props.navigation.closeDrawer();
  };

  const handleSelectConversation = (id: string) => {
    router.push(`/(app)/chat/${id}`);
    props.navigation.closeDrawer();
  };

  const flatData: Array<
    | { type: "header"; title: string; id: string }
    | { type: "item"; conversation: Conversation; id: string }
  > = [];

  for (const group of groups) {
    flatData.push({
      type: "header",
      title: group.title,
      id: `header-${group.title}`,
    });
    for (const conv of group.data) {
      flatData.push({ type: "item", conversation: conv, id: conv.id });
    }
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: dark ? "#0d0d0d" : "#f9f9f9" }]}
      edges={["top", "bottom"]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          OpenNativeUI
        </Text>
        <Pressable
          onPress={handleNewChat}
          style={[
            styles.newChatButton,
            { backgroundColor: dark ? "#1a1a1a" : "#e8e8e8" },
          ]}
        >
          <Ionicons name="create-outline" size={20} color={colors.text} />
        </Pressable>
      </View>

      {/* Conversation list */}
      <FlatList
        data={flatData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 8 }}
        renderItem={({ item }) => {
          if (item.type === "header") {
            return (
              <Text style={styles.sectionHeader}>{item.title}</Text>
            );
          }

          return (
            <ConversationItem
              conversation={item.conversation}
              isActive={item.conversation.id === currentConversationId}
              onPress={() => handleSelectConversation(item.conversation.id)}
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Text style={{ color: "#737373", fontSize: 14 }}>
              No conversations yet
            </Text>
          </View>
        }
      />

      {/* Settings link */}
      <Pressable
        onPress={() => {
          router.push("/(app)/settings");
          props.navigation.closeDrawer();
        }}
        style={[styles.settingsRow, { borderTopColor: colors.border }]}
      >
        <Ionicons name="settings-outline" size={20} color={colors.text} />
        <Text style={[styles.settingsText, { color: colors.text }]}>
          Settings
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  newChatButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "600",
    color: "#737373",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 4,
  },
  emptyList: {
    paddingHorizontal: 16,
    paddingVertical: 48,
    alignItems: "center",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  settingsText: {
    fontSize: 16,
  },
});
