import { useEffect } from "react";
import { Drawer } from "expo-router/drawer";
import { Redirect } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useTheme } from "@react-navigation/native";

import { ConversationList } from "@/components/sidebar/ConversationList";
import { useConversationStore } from "@/stores/conversationStore";
import { useModelStore } from "@/stores/modelStore";
import { useAuthStore } from "@/stores/authStore";
import { connectSocket, disconnectSocket } from "@/services/socket";

export default function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { colors } = useTheme();
  const loadConversations = useConversationStore((s) => s.loadConversations);
  const fetchModels = useModelStore((s) => s.fetchModels);

  useEffect(() => {
    loadConversations();
    fetchModels();
    connectSocket();

    return () => {
      disconnectSocket();
    };
  }, []);

  if (!isAuthenticated) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <ConversationList {...props} />}
        screenOptions={{
          drawerStyle: {
            width: 300,
            backgroundColor: colors.card,
          },
          headerShown: false,
          swipeEnabled: true,
        }}
      >
        <Drawer.Screen name="index" options={{ drawerLabel: "New Chat" }} />
        <Drawer.Screen
          name="chat/[id]"
          options={{ drawerItemStyle: { display: "none" } }}
        />
        <Drawer.Screen
          name="settings"
          options={{ drawerItemStyle: { display: "none" } }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
