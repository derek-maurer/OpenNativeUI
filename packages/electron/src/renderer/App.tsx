import { useEffect, useState } from "react";
import { Routes, Route } from "react-router";
import { useAuthStore, useSettingsStore } from "@opennative/shared";
import { SignInScreen } from "./screens/SignInScreen";
import { MainLayout } from "./layouts/MainLayout";
import { applyThemeClass } from "./lib/theme";
import { ToastProvider } from "./components/ui/Toast";

export function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const theme = useSettingsStore((s) => s.theme);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("dark");

  // Sync with macOS native theme
  useEffect(() => {
    window.electronAPI.getNativeTheme().then(setSystemTheme);
    window.electronAPI.onThemeChanged(setSystemTheme);
    return () => window.electronAPI.removeThemeListener();
  }, []);

  // Apply dark/light class whenever effective theme changes
  useEffect(() => {
    applyThemeClass(theme, systemTheme);
  }, [theme, systemTheme]);

  // Don't render anything until we know the persisted auth state.
  // Without this gate, the async rehydration causes a flash of SignInScreen
  // even when the user has a valid session stored.
  if (!hasHydrated) return null;

  return (
    <ToastProvider>
      {!isAuthenticated ? (
        <SignInScreen />
      ) : (
        <Routes>
          <Route path="/*" element={<MainLayout />} />
        </Routes>
      )}
    </ToastProvider>
  );
}
