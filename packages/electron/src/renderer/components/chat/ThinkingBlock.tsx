import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReasoningEntry } from "@opennative/shared";
import { cleanReasoningText, formatDuration } from "@opennative/shared";

interface ThinkingBlockProps {
  entry: ReasoningEntry;
  /**
   * True while the assistant message that owns this block is still
   * streaming. Individual reasoning entries also carry their own `isDone`
   * flag — the header treats a block as in-progress when EITHER the
   * streaming flag is set OR the entry itself isn't done yet.
   */
  isStreaming?: boolean;
}

export function ThinkingBlock({ entry, isStreaming }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false);

  const inProgress = isStreaming === true || !entry.isDone;
  const isCodeInterpreter = entry.blockType === "code_interpreter";

  const headerLabel = (() => {
    if (entry.summary && !inProgress) {
      return entry.summary;
    }
    if (isCodeInterpreter) {
      return inProgress ? "Analyzing…" : "Analyzed";
    }
    if (inProgress) return "Thinking…";
    if (entry.duration > 0) {
      return `Thought for ${formatDuration(entry.duration)}`;
    }
    return "Thought";
  })();

  const cleanedText = cleanReasoningText(entry.reasoning);

  return (
    <div className="my-2 rounded-xl border border-line-strong bg-surface overflow-hidden">
      <button
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-hover transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? (
          <ChevronDown size={14} className="shrink-0 text-secondary" />
        ) : (
          <ChevronRight size={14} className="shrink-0 text-secondary" />
        )}
        <span
          className={`text-xs font-medium ${
            inProgress ? "text-fg animate-pulse" : "text-secondary"
          }`}
        >
          {headerLabel}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1 text-xs text-secondary selectable max-h-64 overflow-y-auto markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {cleanedText}
              </ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
