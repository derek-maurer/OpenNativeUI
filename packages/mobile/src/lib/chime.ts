import { Audio } from "expo-av";
import { Sound } from "expo-av/build/Audio";

let chimeSound: Sound | null = null;

export async function playChime() {
  try {
    // Unload previous instance to avoid leaks
    if (chimeSound) {
      await chimeSound.unloadAsync();
      chimeSound = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      require("../../assets/sounds/chime.wav"),
      { volume: 0.5, shouldPlay: true }
    );
    chimeSound = sound;

    // Auto-cleanup after playback finishes
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        chimeSound = null;
      }
    });
  } catch (e) {
    // Non-critical — fail silently
    console.warn("Failed to play chime:", e);
  }
}
