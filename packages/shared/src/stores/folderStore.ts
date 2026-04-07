import { create } from "zustand";
import type { Folder, FolderData } from "../lib/types";
import {
  fetchFolders,
  fetchFolderById,
  createFolder as createFolderApi,
  updateFolderName,
  updateFolderExpanded,
  updateFolderData as updateFolderDataApi,
  deleteFolder as deleteFolderApi,
} from "../services/folderApi";

interface FolderState {
  folders: Folder[];
  isLoading: boolean;
  loadFolders: () => Promise<void>;
  /**
   * Fetch a single folder (including its `data` blob) and merge it into
   * the store. The list endpoint omits `data`, so the detail screen calls
   * this on mount to get system_prompt + files.
   */
  loadFolder: (id: string) => Promise<Folder | null>;
  createFolder: (name: string) => Promise<Folder>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  setExpanded: (id: string, isExpanded: boolean) => Promise<void>;
  /**
   * Patch a folder's `data` (system_prompt and/or files). Optimistic with
   * shallow merge — matches the server's merge semantics.
   */
  updateFolderData: (id: string, dataPatch: FolderData) => Promise<void>;
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

  loadFolder: async (id) => {
    try {
      const folder = await fetchFolderById(id);
      set((state) => {
        const exists = state.folders.some((f) => f.id === id);
        return {
          folders: exists
            ? state.folders.map((f) => (f.id === id ? { ...f, ...folder } : f))
            : [...state.folders, folder],
        };
      });
      return folder;
    } catch (e) {
      console.warn("[folderStore] loadFolder failed:", e);
      return null;
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

  updateFolderData: async (id, dataPatch) => {
    const previous = get().folders;
    const now = Math.floor(Date.now() / 1000);
    // Optimistic shallow merge — matches server semantics.
    set({
      folders: previous.map((f) =>
        f.id === id
          ? {
              ...f,
              data: { ...(f.data ?? {}), ...dataPatch },
              updated_at: now,
            }
          : f
      ),
    });
    try {
      const updated = await updateFolderDataApi(id, dataPatch);
      // Reconcile with server response so we pick up any normalization.
      set((state) => ({
        folders: state.folders.map((f) =>
          f.id === id ? { ...f, ...updated } : f
        ),
      }));
    } catch (e) {
      set({ folders: previous });
      throw e;
    }
  },
}));
