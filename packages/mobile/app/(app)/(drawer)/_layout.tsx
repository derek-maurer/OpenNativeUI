import { Platform } from "react-native";
import { Drawer } from "expo-router/drawer";
import { useTheme } from "@react-navigation/native";

import { ConversationList } from "@/components/sidebar/ConversationList";
import { useSidebarStore, COLLAPSED_WIDTH } from "@/stores/sidebarStore";

export default function DrawerLayout() {
  const { colors } = useTheme();
  const isCollapsed = useSidebarStore((s) => s.isCollapsed);
  const drawerWidth = useSidebarStore((s) => s.drawerWidth);

  const isDesktop = Platform.OS === "web";
  const width = isCollapsed ? COLLAPSED_WIDTH : drawerWidth;

  return (
    <Drawer
      drawerContent={(props) => <ConversationList {...props} />}
      screenOptions={{
        drawerType: isDesktop ? "permanent" : "front",
        drawerStyle: {
          width,
          backgroundColor: colors.card,
        },
        headerShown: false,
        swipeEnabled: !isDesktop,
      }}
    >
      <Drawer.Screen name="index" options={{ drawerLabel: "New Chat" }} />
      <Drawer.Screen
        name="chat/[id]"
        options={{ drawerItemStyle: { display: "none" } }}
      />
    </Drawer>
  );
}
