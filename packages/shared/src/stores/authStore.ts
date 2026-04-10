import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { lazyStorage, onStorageRegistered } from "../lib/storage";
import { STORAGE_KEYS } from "../lib/constants";
import type { UserInfo } from "../lib/types";

interface AuthState {
  serverUrl: string;
  token: string;
  user: UserInfo | null;
  isAuthenticated: boolean;
  isConnecting: boolean;
  _hasHydrated: boolean;
  webSearchAvailable: boolean | null;
  setServerUrl: (url: string) => void;
  setAuth: (token: string, user: UserInfo) => void;
  setAuthenticated: (value: boolean) => void;
  setConnecting: (value: boolean) => void;
  setWebSearchAvailable: (value: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      serverUrl: "",
      token: "",
      user: null,
      isAuthenticated: false,
      isConnecting: false,
      _hasHydrated: false,
      webSearchAvailable: null,

      setServerUrl: (url) => set({ serverUrl: url.replace(/\/+$/, "") }),

      setAuth: (token, user) => set({ token, user, isAuthenticated: true }),

      setAuthenticated: (value) => set({ isAuthenticated: value }),

      setConnecting: (value) => set({ isConnecting: value }),

      setWebSearchAvailable: (value) => set({ webSearchAvailable: value }),

      logout: () =>
        set({
          token: "",
          user: null,
          isAuthenticated: false,
          isConnecting: false,
          webSearchAvailable: null,
        }),
    }),
    {
      name: STORAGE_KEYS.AUTH,
      storage: createJSONStorage(() => lazyStorage),
      partialize: (state) => ({
        serverUrl: state.serverUrl,
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        // _hasHydrated intentionally excluded — not persisted
      }),
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ _hasHydrated: true });
      },
    }
  )
);

// If the store was constructed before the platform registered storage,
// rehydrate as soon as it becomes available.
onStorageRegistered(() => {
  useAuthStore.persist.rehydrate();
});
