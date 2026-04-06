/**
 * Side-effect module: registers MMKV as @opennative/shared's persistent
 * storage backend. Must be imported *before* any file that touches the
 * shared barrel (`@opennative/shared`), so that the stores' persist
 * middleware finds a registered storage when rehydration runs.
 *
 * We import `registerStorage` via a relative path directly into the
 * shared package's source, intentionally bypassing the barrel. Going
 * through the barrel would cause all stores to evaluate (and schedule
 * their rehydration microtasks) *before* we got a chance to register
 * the storage — producing "storage is currently unavailable" warnings
 * from Zustand persist.
 */
import { registerStorage } from "../../../shared/src/lib/storage";
import { zustandMMKVStorage } from "./mmkv";

registerStorage(zustandMMKVStorage);
