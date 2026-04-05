import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandMMKVStorage } from "@/lib/mmkv";
import { STORAGE_KEYS } from "@/lib/constants";
import type { UserInfo } from "@/lib/types";

interface AuthState {
  serverUrl: string;
  token: string;
  user: UserInfo | null;
  isAuthenticated: boolean;
  isConnecting: boolean;
  setServerUrl: (url: string) => void;
  setAuth: (token: string, user: UserInfo) => void;
  setAuthenticated: (value: boolean) => void;
  setConnecting: (value: boolean) => void;
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

      setServerUrl: (url) => set({ serverUrl: url.replace(/\/+$/, "") }),

      setAuth: (token, user) => set({ token, user, isAuthenticated: true }),

      setAuthenticated: (value) => set({ isAuthenticated: value }),

      setConnecting: (value) => set({ isConnecting: value }),

      logout: () =>
        set({
          token: "",
          user: null,
          isAuthenticated: false,
          isConnecting: false,
        }),
    }),
    {
      name: STORAGE_KEYS.AUTH,
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({
        serverUrl: state.serverUrl,
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
