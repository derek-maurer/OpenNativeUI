/**
 * Side-effect module: registers MMKV as the persistent storage backend
 * for @opennative/shared's Zustand stores.
 *
 * Stores are constructed against a lazy storage adapter (see
 * shared/src/lib/storage.ts), so this bootstrap can run at any point
 * during startup. Stores that are created before registration will be
 * re-hydrated as soon as `registerStorage` fires their queued
 * onStorageRegistered callbacks.
 */
import { registerStorage } from "@opennative/shared";
import { zustandMMKVStorage } from "./mmkv";

registerStorage(zustandMMKVStorage);
