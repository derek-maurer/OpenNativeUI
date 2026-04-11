import { useRef } from "react";
import { PanResponder } from "react-native";

import { useSidebarStore } from "@/stores/sidebarStore";

/**
 * PanResponder that tracks horizontal drag to update the sidebar drawer
 * width. Used by the desktop (web) drawer's resize handle.
 */
export function useDrawerResize() {
  const dragStartWidth = useRef(0);
  return useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartWidth.current = useSidebarStore.getState().drawerWidth;
      },
      onPanResponderMove: (_e, g) => {
        useSidebarStore.getState().setDrawerWidth(dragStartWidth.current + g.dx);
      },
    })
  ).current;
}
