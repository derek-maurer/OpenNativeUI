import { useAuthStore, getGreeting, getShownSuggestions } from "@opennative/shared";

// Pick 4 random suggestions, stable per session
const SHOWN = getShownSuggestions();

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
