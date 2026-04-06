import { useEffect } from "react";
import { Stack, Redirect } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useConversationStore } from "@opennative/shared";
import { useFolderStore } from "@opennative/shared";
import { useModelStore } from "@opennative/shared";
import { useAuthStore } from "@opennative/shared";
import { connectSocket, disconnectSocket } from "@opennative/shared";

export default function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loadConversations = useConversationStore((s) => s.loadConversations);
  const reloadFolderMemberships = useConversationStore(
    (s) => s.reloadFolderMemberships
  );
  const loadFolders = useFolderStore((s) => s.loadFolders);
  const fetchModels = useModelStore((s) => s.fetchModels);

  useEffect(() => {
    (async () => {
      await Promise.all([loadConversations(), loadFolders()]);
      await reloadFolderMemberships();
    })();
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
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(drawer)" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="folders/index" />
        <Stack.Screen name="folders/[id]" />
      </Stack>
    </GestureHandlerRootView>
  );
}
