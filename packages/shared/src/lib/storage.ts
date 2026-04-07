import type { StateStorage } from "zustand/middleware";

/**
 * Abstract persistent key-value storage for Zustand stores.
 *
 * Each platform package (mobile, macos, ...) registers a concrete
 * implementation at app startup by calling {@link registerStorage}.
 *
 * Persisted stores hand {@link lazyStorage} to `createJSONStorage`. The
 * lazy adapter resolves the registered backend on every call, so stores
 * may be constructed before the platform finishes registering storage.
 * After registration, any store that was created early gets re-hydrated
 * via the {@link onStorageRegistered} callbacks it queued at construction.
 *
 * This indirection is required because Expo Router builds its route
 * tree by evaluating route files in an order we do not control. Many of
 * those files import the shared barrel (which constructs the stores)
 * before the root layout has a chance to call `registerStorage`. With
 * an eager `getStorage()` lookup inside `createJSONStorage`, those
 * early-evaluated stores would silently fall into a no-op state because
 * `createJSONStorage` swallows the "storage not registered" error and
 * returns `undefined`, leaving persist permanently disabled for that
 * store.
 */

let _backend: StateStorage | null = null;
const _onReadyCallbacks = new Set<() => void>();

export function registerStorage(impl: StateStorage): void {
  _backend = impl;
  _onReadyCallbacks.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.error("[shared/storage] rehydration callback failed", e);
    }
  });
  _onReadyCallbacks.clear();
}

export const lazyStorage: StateStorage = {
  getItem: (name) => (_backend ? _backend.getItem(name) : null),
  setItem: (name, value) => {
    if (!_backend) return;
    _backend.setItem(name, value);
  },
  removeItem: (name) => {
    if (!_backend) return;
    _backend.removeItem(name);
  },
};

/**
 * Register a callback to run when storage becomes available. Fires
 * immediately if a backend is already registered. Persisted stores use
 * this to call `useStore.persist.rehydrate()` so that any store
 * constructed before bootstrap recovers its persisted state.
 */
export function onStorageRegistered(cb: () => void): void {
  if (_backend) {
    cb();
  } else {
    _onReadyCallbacks.add(cb);
  }
}
