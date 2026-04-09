import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useConversationStore } from "@opennative/shared";
import { MessageSquare, Search } from "lucide-react";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
}

export function ConversationSearchModal({ visible, onClose, onSelect }: Props) {
  const conversations = useConversationStore((s) => s.conversations);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? conversations.filter((c) =>
        (c.title ?? "").toLowerCase().includes(query.toLowerCase())
      )
    : conversations.slice(0, 12);

  // Reset state and focus input on open
  useEffect(() => {
    if (visible) {
      setQuery("");
      setActiveIndex(0);
      // defer so the portal has rendered
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [visible]);

  // Clamp active index when filtered list shrinks
  useEffect(() => {
    setActiveIndex((i) => (filtered.length === 0 ? 0 : Math.min(i, filtered.length - 1)));
  }, [filtered.length]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const conv = filtered[activeIndex];
        if (conv) {
          onSelect(conv.id);
          onClose();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, filtered, activeIndex, onClose, onSelect]);

  if (!visible) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-surface border border-line-strong shadow-2xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-line">
          <Search size={15} className="text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search conversations…"
            className="flex-1 bg-transparent text-sm text-fg placeholder-dim focus:outline-none"
          />
          <span className="text-[11px] text-dim font-mono shrink-0">esc</span>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-dim">
              {query ? "No conversations found" : "No conversations yet"}
            </p>
          ) : (
            filtered.map((conv, i) => (
              <button
                key={conv.id}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === activeIndex
                    ? "bg-hover text-fg"
                    : "text-fg hover:bg-hover"
                }`}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => {
                  onSelect(conv.id);
                  onClose();
                }}
              >
                <MessageSquare size={14} className="shrink-0 text-muted" />
                <span className="flex-1 truncate text-sm">
                  {conv.title || "New conversation"}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
