import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { lazyStorage, onStorageRegistered } from "../lib/storage";
import { STORAGE_KEYS } from "../lib/constants";

type ThemeMode = "light" | "dark" | "system";

interface SettingsState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  chimeOnComplete: boolean;
  setChimeOnComplete: (enabled: boolean) => void;
  hapticOnComplete: boolean;
  setHapticOnComplete: (enabled: boolean) => void;
  webSearchByDefault: boolean;
  setWebSearchByDefault: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
      chimeOnComplete: true,
      setChimeOnComplete: (enabled) => set({ chimeOnComplete: enabled }),
      hapticOnComplete: true,
      setHapticOnComplete: (enabled) => set({ hapticOnComplete: enabled }),
      webSearchByDefault: false,
      setWebSearchByDefault: (enabled) => set({ webSearchByDefault: enabled }),
    }),
    {
      name: STORAGE_KEYS.SETTINGS,
      storage: createJSONStorage(() => lazyStorage),
    }
  )
);

onStorageRegistered(() => {
  useSettingsStore.persist.rehydrate();
});
