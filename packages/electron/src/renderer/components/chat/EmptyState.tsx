import { useAuthStore } from "@opennative/shared";

const SUGGESTIONS = [
  "Explain a concept like I'm new to it",
  "Write a function to solve a coding problem",
  "Summarize a document or text",
  "Help me brainstorm ideas",
  "Debug code and explain the fix",
  "Draft an email or message",
];

function getGreeting(firstName: string): { heading: string; sub: string } {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return {
      heading: `Good morning, ${firstName}`,
      sub: "What can I help you with today?",
    };
  }
  if (hour >= 12 && hour < 17) {
    return {
      heading: `Good afternoon, ${firstName}`,
      sub: "What's on your mind?",
    };
  }
  if (hour >= 17 && hour < 21) {
    return {
      heading: `Good evening, ${firstName}`,
      sub: "What can I help you with?",
    };
  }
  return {
    heading: `Working late, ${firstName}?`,
    sub: "I'm here whenever you need me.",
  };
}

// Pick 4 random suggestions, stable per session
const SHOWN = SUGGESTIONS.sort(() => Math.random() - 0.5).slice(0, 4);

export function EmptyState({ onSuggest }: { onSuggest: (text: string) => void }) {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const { heading, sub } = getGreeting(firstName);

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 pb-12 select-none">
      {/* Greeting */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-fg mb-1">{heading}</h1>
        <p className="text-sm text-muted">{sub}</p>
      </div>

      {/* Suggestion chips */}
      <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
        {SHOWN.map((text) => (
          <button
            key={text}
            onClick={() => onSuggest(text)}
            className="text-left rounded-xl border border-line bg-sidebar hover:bg-hover hover:border-line-strong px-4 py-3 text-xs text-secondary hover:text-fg transition-colors leading-relaxed"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
