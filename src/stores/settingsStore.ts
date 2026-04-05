import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandMMKVStorage } from "@/lib/mmkv";
import { STORAGE_KEYS } from "@/lib/constants";

type ThemeMode = "light" | "dark" | "system";

interface SettingsState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: STORAGE_KEYS.SETTINGS,
      storage: createJSONStorage(() => zustandMMKVStorage),
    }
  )
);
