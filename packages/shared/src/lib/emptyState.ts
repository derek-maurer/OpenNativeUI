export const SUGGESTIONS = [
  "Explain a concept like I'm new to it",
  "Write a function to solve a coding problem",
  "Summarize a document or text",
  "Help me brainstorm ideas",
  "Debug code and explain the fix",
  "Draft an email or message",
] as const;

export function getGreeting(firstName: string): { heading: string; sub: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return { heading: `Good morning, ${firstName}`, sub: "What can I help you with today?" };
  }
  if (hour >= 12 && hour < 17) {
    return { heading: `Good afternoon, ${firstName}`, sub: "What's on your mind?" };
  }
  if (hour >= 17 && hour < 21) {
    return { heading: `Good evening, ${firstName}`, sub: "What can I help you with?" };
  }
  return { heading: `Working late, ${firstName}?`, sub: "I'm here whenever you need me." };
}

/** Returns 4 randomly shuffled suggestions, stable per call (copy-before-sort). */
export function getShownSuggestions(): string[] {
  return [...SUGGESTIONS].sort(() => Math.random() - 0.5).slice(0, 4);
}
