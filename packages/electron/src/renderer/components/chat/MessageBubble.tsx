import { useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import type { Message } from "@opennative/shared";
import { parseReasoningSegments, hasReasoningContent } from "@opennative/shared";
import { ThinkingBlock } from "./ThinkingBlock";
import { MessageSources, flattenCitations } from "./MessageSources";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
  inline?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const text = String(children ?? "");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [children]);

  const isBlock = className?.startsWith("language-");
  if (!isBlock) {
    return (
      <code className="rounded bg-neutral-700 px-1 py-0.5 text-xs font-mono text-neutral-200">
        {children}
      </code>
    );
  }

  return (
    <div className="group relative my-2 rounded-xl overflow-hidden border border-neutral-700">
      <div className="flex items-center justify-between bg-neutral-800 px-3 py-1.5">
        <span className="text-xs text-neutral-400 font-mono">
          {className?.replace("language-", "") ?? ""}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check size={12} />
              Copied
            </>
          ) : (
            <>
              <Copy size={12} />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed bg-neutral-900">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

const mdComponents = {
  code: CodeBlock as any,
  a: ({ href, children }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline hover:text-emerald-400 transition-colors"
    >
      {children}
    </a>
  ),
  // Citation badges [N]
  p: ({ children }: any) => {
    const processed = processCitations(children);
    return <p className="mb-2 last:mb-0">{processed}</p>;
  },
};

function processCitations(children: React.ReactNode): React.ReactNode {
  if (typeof children !== "string") return children;
  const parts = children.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      return (
        <span
          key={i}
          className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white mx-0.5 translate-y-[-1px]"
        >
          {match[1]}
        </span>
      );
    }
    return part;
  });
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const sources = message.sources ?? [];

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-1">
        <div className="max-w-[75%]">
          {/* User text */}
          {message.content && (
            <div className="rounded-2xl rounded-br-sm bg-[#2a2a2a] px-4 py-2.5 text-sm text-white selectable">
              {message.content}
            </div>
          )}

          {/* Attached images */}
          {message.files?.filter((f) => f.type === "image").map((file, i) => (
            <img
              key={i}
              src={file.dataUrl ?? file.uri}
              alt={file.name ?? "attachment"}
              className="mt-2 max-w-full rounded-xl border border-neutral-700"
            />
          ))}
        </div>
      </div>
    );
  }

  // Assistant message
  const content = message.content ?? "";
  const segments = hasReasoningContent(content)
    ? parseReasoningSegments(content)
    : null;

  return (
    <div className="flex items-start gap-3 px-4 py-1">
      {/* Avatar */}
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
        AI
      </div>

      <div className="min-w-0 flex-1">
        {segments ? (
          <>
            {segments.map((seg, i) => {
              if (seg.kind === "reasoning") {
                return <ThinkingBlock key={i} entry={seg.entry} />;
              }
              return seg.text ? (
                <div key={i} className="text-sm text-neutral-100 selectable">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={mdComponents}
                  >
                    {seg.text}
                  </ReactMarkdown>
                </div>
              ) : null;
            })}
          </>
        ) : (
          <div className="text-sm text-neutral-100 selectable">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={mdComponents}
            >
              {content}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block ml-0.5 h-4 w-0.5 animate-pulse bg-white opacity-70 translate-y-0.5" />
            )}
          </div>
        )}

        {/* Sources */}
        {sources.length > 0 && flattenCitations(sources).length > 0 && (
          <MessageSources sources={sources} />
        )}
      </div>
    </div>
  );
}
