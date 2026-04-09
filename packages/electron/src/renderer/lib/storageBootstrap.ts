/**
 * Side-effect module: registers a file-backed IPC storage as the persistent
 * storage backend for @opennative/shared's Zustand stores.
 *
 * Uses the main process (via IPC) to read/write a JSON file in userData.
 * This fixes two Electron-specific problems with plain localStorage:
 *   1. Dev-mode data loss — Chromium doesn't flush its localStorage write-
 *      behind buffer when the process is killed by Ctrl+C / SIGTERM, so auth
 *      is lost on every dev restart.
 *   2. Cross-window staleness — the chat bar and main window each have their
 *      own JS context; reads/writes routed through the main process give both
 *      windows a single consistent store.
 *
 * Must be imported before any @opennative/shared import in main.tsx.
 */
import { registerStorage } from "@opennative/shared";
import type { StateStorage } from "zustand/middleware";

const ipcStorageAdapter: StateStorage = {
  getItem: (name) => window.electronAPI.storageGetItem(name),
  setItem: (name, value) => window.electronAPI.storageSetItem(name, value),
  removeItem: (name) => window.electronAPI.storageRemoveItem(name),
};

registerStorage(ipcStorageAdapter);
