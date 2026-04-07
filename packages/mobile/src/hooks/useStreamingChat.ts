import { useCallback } from "react";
import * as Haptics from "expo-haptics";

import { useStreamingChat as useStreamingChatShared } from "@opennative/shared";
import { useSettingsStore } from "@opennative/shared";
import { playChime } from "@/lib/chime";

/**
 * Mobile wrapper around the shared useStreamingChat hook.
 * Adds haptic and audio-chime feedback on response completion.
 */
export function useStreamingChat() {
  const onComplete = useCallback(() => {
    const { hapticOnComplete, chimeOnComplete } = useSettingsStore.getState();
    if (hapticOnComplete) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (chimeOnComplete) {
      playChime();
    }
  }, []);

  return useStreamingChatShared({ onComplete });
}
