import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandMMKVStorage } from "@/lib/mmkv";
import { STORAGE_KEYS } from "@/lib/constants";
import type { ThinkingLevel } from "@/lib/types";

/**
 * Per-model UI preferences that should persist across sessions and follow
 * the model the user selects (e.g. "Gemma was last used with thinking on,
 * GPT-OSS was last used with thinking=high").
 */
interface ModelPreferencesState {
  thinkingByModel: Record<string, ThinkingLevel | null>;
  setThinkingForModel: (
    modelId: string,
    level: ThinkingLevel | null,
  ) => void;
}

export const useModelPreferencesStore = create<ModelPreferencesState>()(
  persist(
    (set) => ({
      thinkingByModel: {},
      setThinkingForModel: (modelId, level) =>
        set((state) => ({
          thinkingByModel: { ...state.thinkingByModel, [modelId]: level },
        })),
    }),
    {
      name: STORAGE_KEYS.MODEL_PREFERENCES,
      storage: createJSONStorage(() => zustandMMKVStorage),
    },
  ),
);

/** Convenience selector — returns the saved thinking level for a model, or null. */
export function getThinkingForModel(
  modelId: string | null | undefined,
): ThinkingLevel | null {
  if (!modelId) return null;
  return useModelPreferencesStore.getState().thinkingByModel[modelId] ?? null;
}
