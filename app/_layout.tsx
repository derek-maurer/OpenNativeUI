import "../global.css";
import { useEffect } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import "react-native-reanimated";

import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { validateToken } from "@/services/api";

SplashScreen.preventAutoHideAsync();

const AppDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#0d0d0d",
    card: "#171717",
    border: "#2a2a2a",
    text: "#ffffff",
    primary: "#10a37f",
  },
};

const AppLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#ffffff",
    card: "#f9f9f9",
    border: "#e5e5e5",
    text: "#0a0a0a",
    primary: "#10a37f",
  },
};

export default function RootLayout() {
  const systemColorScheme = useSystemColorScheme();
  const theme = useSettingsStore((s) => s.theme);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const effectiveScheme =
    theme === "system" ? systemColorScheme ?? "dark" : theme;

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      validateToken().catch(() => {
        useAuthStore.getState().logout();
      });
    }
  }, []);

  return (
    <ThemeProvider
      value={effectiveScheme === "dark" ? AppDarkTheme : AppLightTheme}
    >
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="(app)" />
      </Stack>
      <StatusBar style={effectiveScheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}
