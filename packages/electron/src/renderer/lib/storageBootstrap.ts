/**
 * Side-effect module: registers localStorage as the persistent storage
 * backend for @opennative/shared's Zustand stores.
 *
 * Must be imported before any @opennative/shared import in main.tsx.
 */
import { registerStorage } from "@opennative/shared";
import type { StateStorage } from "zustand/middleware";

const localStorageAdapter: StateStorage = {
  getItem: (name) => localStorage.getItem(name),
  setItem: (name, value) => localStorage.setItem(name, value),
  removeItem: (name) => localStorage.removeItem(name),
};

registerStorage(localStorageAdapter);
