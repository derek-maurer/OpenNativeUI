import { create } from "zustand";
import type { Folder } from "@/lib/types";
import {
  fetchFolders,
  createFolder as createFolderApi,
  updateFolderName,
  updateFolderExpanded,
  deleteFolder as deleteFolderApi,
} from "@/services/folderApi";

interface FolderState {
  folders: Folder[];
  isLoading: boolean;
  loadFolders: () => Promise<void>;
  createFolder: (name: string) => Promise<Folder>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  setExpanded: (id: string, isExpanded: boolean) => Promise<void>;
}

export const useFolderStore = create<FolderState>()((set, get) => ({
  folders: [],
  isLoading: false,

  loadFolders: async () => {
    set({ isLoading: true });
    try {
      const folders = await fetchFolders();
      set({ folders, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createFolder: async (name) => {
    const folder = await createFolderApi(name);
    set((state) => ({ folders: [...state.folders, folder] }));
    return folder;
  },

  renameFolder: async (id, name) => {
    await updateFolderName(id, name);
    set((state) => ({
      folders: state.folders.map((f) =>
        f.id === id ? { ...f, name, updated_at: Math.floor(Date.now() / 1000) } : f
      ),
    }));
  },

  deleteFolder: async (id) => {
    await deleteFolderApi(id);
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id),
    }));
  },

  setExpanded: async (id, isExpanded) => {
    // Optimistic update
    const previous = get().folders;
    set({
      folders: previous.map((f) =>
        f.id === id ? { ...f, is_expanded: isExpanded } : f
      ),
    });
    try {
      await updateFolderExpanded(id, isExpanded);
    } catch (e) {
      // Revert on failure
      set({ folders: previous });
      throw e;
    }
  },
}));
