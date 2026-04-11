import { Platform } from "react-native";
import { useRouter } from "expo-router";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";

import {
  useChatStore,
  useConversationStore,
  useFolderStore,
} from "@opennative/shared";
import type { Folder } from "@opennative/shared";

import { useSidebarStore } from "@/stores/sidebarStore";
import { CollapsedDrawer } from "./CollapsedDrawer";
import { ExpandedDrawer } from "./ExpandedDrawer";

export function ConversationList(props: DrawerContentComponentProps) {
  const router = useRouter();

  const conversations = useConversationStore((s) => s.conversations);
  const isLoading = useConversationStore((s) => s.isLoading);
  const loadConversations = useConversationStore((s) => s.loadConversations);
  const reloadFolderMemberships = useConversationStore(
    (s) => s.reloadFolderMemberships
  );
  const folders = useFolderStore((s) => s.folders);
  const loadFolders = useFolderStore((s) => s.loadFolders);
  const currentConversationId = useChatStore((s) => s.currentConversationId);
  const clearChat = useChatStore((s) => s.clearChat);

  const isCollapsed = useSidebarStore((s) => s.isCollapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);

  const isDesktop = Platform.OS === "web";

  const handleNewChat = () => {
    clearChat();
    router.replace("/(app)");
    props.navigation.closeDrawer();
  };

  const handleSelectConversation = (id: string) => {
    router.push(`/(app)/chat/${id}`);
    props.navigation.closeDrawer();
  };

  const handleOpenFolders = () => {
    router.push("/(app)/folders");
    props.navigation.closeDrawer();
  };

  const handleOpenFolder = (folder: Folder) => {
    router.push(`/(app)/folders/${folder.id}`);
    props.navigation.closeDrawer();
  };

  const handleRefresh = async () => {
    await Promise.all([loadConversations(), loadFolders()]);
    await reloadFolderMemberships();
  };

  const handleOpenSettings = () => {
    router.push("/(app)/settings");
    props.navigation.closeDrawer();
  };

  if (isCollapsed) {
    return (
      <CollapsedDrawer
        onExpand={toggleCollapsed}
        onNewChat={handleNewChat}
        onOpenFolders={handleOpenFolders}
        onOpenSettings={handleOpenSettings}
      />
    );
  }

  return (
    <ExpandedDrawer
      conversations={conversations}
      folders={folders}
      currentConversationId={currentConversationId}
      isLoading={isLoading}
      canCollapse={isDesktop}
      onRefresh={handleRefresh}
      onNewChat={handleNewChat}
      onToggleCollapsed={toggleCollapsed}
      onSelectConversation={handleSelectConversation}
      onOpenFolders={handleOpenFolders}
      onOpenFolder={handleOpenFolder}
      onOpenSettings={handleOpenSettings}
    />
  );
}
