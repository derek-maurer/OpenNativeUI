/**
 * Side-effect module: registers MMKV as the persistent storage backend
 * for @opennative/shared's Zustand stores.
 *
 * Must be imported before any @opennative/shared barrel import so that
 * stores are constructed against an already-registered backend.
 */
import { registerStorage } from "@opennative/shared";
import { zustandMMKVStorage } from "./mmkv";

registerStorage(zustandMMKVStorage);
