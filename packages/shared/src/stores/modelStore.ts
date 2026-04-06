import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getStorage } from "../lib/storage";
import { apiGet } from "../services/api";
import { API_PATHS, STORAGE_KEYS } from "../lib/constants";
import type { Model, ModelsResponse } from "../lib/types";

interface ModelState {
  models: Model[];
  selectedModelId: string | null;
  defaultModelId: string | null;
  isLoading: boolean;
  fetchModels: () => Promise<void>;
  setSelectedModel: (id: string) => void;
  setDefaultModel: (id: string | null) => void;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      models: [],
      selectedModelId: null,
      defaultModelId: null,
      isLoading: false,

      fetchModels: async () => {
        set({ isLoading: true });
        try {
          const response = await apiGet<ModelsResponse>(API_PATHS.MODELS);
          const models = response.data ?? [];
          set({ models, isLoading: false });

          // Auto-select: prefer default model, then fall back to first model
          if (!get().selectedModelId && models.length > 0) {
            const defaultId = get().defaultModelId;
            const hasDefault = defaultId && models.some((m) => m.id === defaultId);
            set({ selectedModelId: hasDefault ? defaultId : models[0].id });
          }
        } catch {
          set({ isLoading: false });
        }
      },

      setSelectedModel: (id) => set({ selectedModelId: id }),
      setDefaultModel: (id) => set({ defaultModelId: id }),
    }),
    {
      name: STORAGE_KEYS.MODELS,
      storage: createJSONStorage(() => getStorage()),
      partialize: (state) => ({
        selectedModelId: state.selectedModelId,
        defaultModelId: state.defaultModelId,
      }),
    }
  )
);
