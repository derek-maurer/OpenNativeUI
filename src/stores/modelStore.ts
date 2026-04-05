import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandMMKVStorage } from "@/lib/mmkv";
import { apiGet } from "@/services/api";
import { API_PATHS, STORAGE_KEYS } from "@/lib/constants";
import type { Model, ModelsResponse } from "@/lib/types";

interface ModelState {
  models: Model[];
  selectedModelId: string | null;
  isLoading: boolean;
  fetchModels: () => Promise<void>;
  setSelectedModel: (id: string) => void;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      models: [],
      selectedModelId: null,
      isLoading: false,

      fetchModels: async () => {
        set({ isLoading: true });
        try {
          const response = await apiGet<ModelsResponse>(API_PATHS.MODELS);
          const models = response.data ?? [];
          set({ models, isLoading: false });

          // Auto-select first model if none selected
          if (!get().selectedModelId && models.length > 0) {
            set({ selectedModelId: models[0].id });
          }
        } catch {
          set({ isLoading: false });
        }
      },

      setSelectedModel: (id) => set({ selectedModelId: id }),
    }),
    {
      name: STORAGE_KEYS.MODELS,
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({
        selectedModelId: state.selectedModelId,
      }),
    }
  )
);
