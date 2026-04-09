import { create } from "zustand";

export const COLLAPSED_WIDTH = 64;
export const DEFAULT_WIDTH = 280;
export const MAX_WIDTH = 400;
export const MIN_WIDTH = 200;

interface SidebarStore {
  isCollapsed: boolean;
  drawerWidth: number;
  toggleCollapsed: () => void;
  setDrawerWidth: (width: number) => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  isCollapsed: false,
  drawerWidth: DEFAULT_WIDTH,
  toggleCollapsed: () => set((s) => ({ isCollapsed: !s.isCollapsed })),
  setDrawerWidth: (width: number) =>
    set({ drawerWidth: Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width)) }),
}));
