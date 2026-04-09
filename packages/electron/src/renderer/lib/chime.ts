import chimeUrl from "../assets/sounds/chime.wav?url";

let audio: HTMLAudioElement | null = null;

export function playChime() {
  try {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    audio = new Audio(chimeUrl);
    audio.volume = 0.5;
    audio.play().catch((e) => console.warn("Failed to play chime:", e));
    audio.addEventListener("ended", () => {
      audio = null;
    });
  } catch (e) {
    console.warn("Failed to play chime:", e);
  }
}
