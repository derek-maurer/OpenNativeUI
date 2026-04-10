import { useRef, useState } from "react";
import { useChatStore } from "@opennative/shared";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { EmptyState } from "./EmptyState";
import { ChevronDown } from "lucide-react";

interface MessageListProps {
  onSuggest?: (text: string) => void;
}

export function MessageList({ onSuggest }: MessageListProps) {
  const messages = useChatStore((s) => s.messages);
  const streamingContent = useChatStore((s) => s.streamingContent);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const statusHistory = useChatStore((s) => s.statusHistory);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const el = containerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  };

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.clientHeight - el.scrollTop;
    setIsAtBottom(distanceFromBottom <= 80);
  };

  // Build display items — merge streaming content into last assistant message
  const displayMessages = [...messages];
  const showStreamingBubble = isStreaming && streamingContent;

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={containerRef}
        className="h-full overflow-y-auto py-4"
        onScroll={handleScroll}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="min-h-full flex flex-col justify-end">
          {displayMessages.length === 0 && !isStreaming && (
            <EmptyState onSuggest={onSuggest ?? (() => {})} />
          )}

          {displayMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isStreaming={false}
            />
          ))}

          {showStreamingBubble && (
            <MessageBubble
              message={{
                id: "__streaming__",
                conversationId: "",
                role: "assistant",
                content: streamingContent,
                createdAt: Date.now(),
              }}
              isStreaming
            />
          )}

          {isStreaming && !streamingContent && (
            <TypingIndicator
              statusHistory={statusHistory.length > 0 ? statusHistory : undefined}
            />
          )}

          {/* Scroll anchor */}
          <div className="h-4" />
        </div>
      </div>

      {/* Scroll-to-bottom button */}
      {!isAtBottom && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-surface border border-line-strong text-fg shadow-lg hover:bg-hover transition-colors"
        >
          <ChevronDown size={16} />
        </button>
      )}
    </div>
  );
}
