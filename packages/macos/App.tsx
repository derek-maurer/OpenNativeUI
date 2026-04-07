// Polyfill crypto.randomUUID — not available in all Hermes/macOS builds.
// Must be first, before any module that calls crypto.randomUUID().
if (typeof globalThis.crypto === "undefined" || !globalThis.crypto.randomUUID) {
  (globalThis as any).crypto = {
    ...((globalThis as any).crypto ?? {}),
    randomUUID: (): string =>
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      }),
  };
}

import "./global.css";
// Must run before any @opennative/shared import — registers MMKV as the
// shared package's storage backend. See src/lib/storageBootstrap.ts.
import "@/lib/storageBootstrap";

import { useEffect } from "react";
import { useColorScheme } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useAuthStore, useSettingsStore, validateToken } from "@opennative/shared";
import { RootNavigator } from "@/navigation/RootNavigator";

const AppDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#0d0d0d",
    card: "#171717",
    border: "#2a2a2a",
    text: "#ffffff",
    primary: "#10a37f",
    notification: "#10a37f",
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
    notification: "#10a37f",
  },
};

export default function App() {
  const systemColorScheme = useColorScheme();
  const theme = useSettingsStore((s) => s.theme);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const effectiveScheme =
    theme === "system" ? (systemColorScheme ?? "dark") : theme;

  useEffect(() => {
    if (isAuthenticated) {
      validateToken().catch(() => {
        useAuthStore.getState().logout();
      });
    }
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer
        theme={effectiveScheme === "dark" ? AppDarkTheme : AppLightTheme}
      >
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
