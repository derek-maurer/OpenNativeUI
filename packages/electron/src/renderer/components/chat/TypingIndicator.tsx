import type { StreamingStatus } from "@opennative/shared";

interface TypingIndicatorProps {
  statusHistory?: StreamingStatus[];
}

export function TypingIndicator({ statusHistory }: TypingIndicatorProps) {
  const visibleHistory = statusHistory?.filter((s) => s.description) ?? [];

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      {/* Avatar */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
        AI
      </div>

      <div className="flex flex-col gap-1.5">
        {/* Animated dots */}
        <div className="flex gap-1 pt-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block h-2 w-2 rounded-full bg-secondary"
              style={{
                animation: "bounceDot 1.4s infinite ease-in-out",
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>

        {/* Status rows — text left-aligned with dots, no bullet offset */}
        {visibleHistory.map((entry, i) =>
          entry.done ? (
            <span key={entry.action ?? i} className="text-xs text-fg-muted">
              {entry.description}
            </span>
          ) : (
            <span
              key={entry.action ?? i}
              className="shimmer-label text-xs"
            >
              {entry.description}
            </span>
          )
        )}
      </div>
    </div>
  );
}
