interface TypingIndicatorProps {
  description?: string;
}

export function TypingIndicator({ description }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Avatar */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
        AI
      </div>
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block h-2 w-2 rounded-full bg-neutral-400"
              style={{
                animation: "bounceDot 1.4s infinite ease-in-out",
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
        {description ? (
          <span className="text-xs text-neutral-400">{description}</span>
        ) : null}
      </div>
    </div>
  );
}
