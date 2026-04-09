import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReasoningEntry } from "@opennative/shared";
import { cleanReasoningText, formatDuration } from "@opennative/shared";

interface ThinkingBlockProps {
  entry: ReasoningEntry;
}

export function ThinkingBlock({ entry }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false);

  const inProgress = !entry.isDone;
  const durationText =
    entry.isDone && entry.duration != null
      ? `Thought for ${formatDuration(entry.duration)}`
      : "Thinking…";

  const cleanedText = cleanReasoningText(entry.reasoning);

  const headerLabel =
    entry.blockType === "code_interpreter" ? "Code Interpreter" : durationText;

  return (
    <div className="my-2 rounded-xl border border-neutral-700 bg-neutral-800/50 overflow-hidden">
      <button
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-neutral-700/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? (
          <ChevronDown size={14} className="shrink-0 text-neutral-400" />
        ) : (
          <ChevronRight size={14} className="shrink-0 text-neutral-400" />
        )}
        <span
          className={`text-xs font-medium ${
            inProgress ? "text-neutral-300 animate-pulse" : "text-neutral-400"
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
            <div className="px-4 pb-3 pt-1 text-xs text-neutral-400 selectable max-h-64 overflow-y-auto markdown">
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
