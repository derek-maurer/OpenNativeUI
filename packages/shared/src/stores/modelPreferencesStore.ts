import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { lazyStorage, onStorageRegistered } from "../lib/storage";
import { STORAGE_KEYS } from "../lib/constants";
import type { ThinkingValue } from "../lib/modelCapabilities";

/**
 * Per-model UI preferences that should persist across sessions and follow
 * the model the user selects (e.g. "Gemma was last used with thinking on,
 * GPT-5 was last used with reasoning_effort=high").
 *
 * The stored value is the raw `value` from the matching ThinkingProfile
 * option — a string for tiered effort levels, a boolean for on/off
 * toggles, or null when the user has not enabled thinking for that model.
 */
interface ModelPreferencesState {
  thinkingByModel: Record<string, ThinkingValue | null>;
  setThinkingForModel: (
    modelId: string,
    value: ThinkingValue | null,
  ) => void;
}

export const useModelPreferencesStore = create<ModelPreferencesState>()(
  persist(
    (set) => ({
      thinkingByModel: {},
      setThinkingForModel: (modelId, value) =>
        set((state) => ({
          thinkingByModel: { ...state.thinkingByModel, [modelId]: value },
        })),
    }),
    {
      name: STORAGE_KEYS.MODEL_PREFERENCES,
      storage: createJSONStorage(() => lazyStorage),
    },
  ),
);

onStorageRegistered(() => {
  useModelPreferencesStore.persist.rehydrate();
});

/** Convenience selector — returns the saved thinking value for a model, or null. */
export function getThinkingForModel(
  modelId: string | null | undefined,
): ThinkingValue | null {
  if (!modelId) return null;
  return useModelPreferencesStore.getState().thinkingByModel[modelId] ?? null;
}
