import { Drawer } from "expo-router/drawer";
import { useTheme } from "@react-navigation/native";

import { ConversationList } from "@/components/sidebar/ConversationList";

export default function DrawerLayout() {
  const { colors } = useTheme();

  return (
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
    </Drawer>
  );
}
