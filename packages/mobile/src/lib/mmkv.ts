import { createMMKV } from "react-native-mmkv";
import type { StateStorage } from "zustand/middleware";

export const storage = createMMKV({ id: "opennativeui" });

export const zustandMMKVStorage: StateStorage = {
  setItem: (name, value) => {
    storage.set(name, value);
  },
  getItem: (name) => {
    return storage.getString(name) ?? null;
  },
  removeItem: (name) => {
    storage.remove(name);
  },
};
