import type { StateStorage } from "zustand/middleware";

/**
 * Abstract persistent key-value storage for Zustand stores.
 *
 * Each platform package (mobile, macos, ...) must register a concrete
 * implementation at app startup — before any store is touched — by
 * calling {@link registerStorage}. The stores then read the registered
 * impl lazily via {@link getStorage}, which is safe inside Zustand's
 * `createJSONStorage(() => getStorage())` getter because that getter
 * only runs on the first store access.
 *
 * Mobile uses `react-native-mmkv`; macOS will provide its own impl.
 */

let _storage: StateStorage | null = null;

export function registerStorage(impl: StateStorage): void {
  _storage = impl;
}

export function getStorage(): StateStorage {
  if (!_storage) {
    throw new Error(
      "[@opennative/shared] Storage has not been registered. " +
        "Call registerStorage() from your platform package before any " +
        "persisted store is accessed."
    );
  }
  return _storage;
}
