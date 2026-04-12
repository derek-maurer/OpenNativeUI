import { isValidElement, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import type { Message, MessageSourceMetadata } from "@opennative/shared";
import { parseReasoningSegments, hasReasoningContent } from "@opennative/shared";
import { ThinkingBlock } from "./ThinkingBlock";
import { MessageSources, flattenCitations } from "./MessageSources";
import { MessageActions } from "./MessageActions";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  onRetry?: () => void;
}

// Recursively extract plain text from React children (needed because
// rehype-highlight wraps code in <span> nodes, not plain strings).
function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) return extractText((node.props as any)?.children);
  return "";
}

function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(extractText(children)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [children]);

  // Inline code — no language class
  if (!className?.includes("language-")) {
    return (
      <code className="rounded bg-hover px-1.5 py-0.5 text-xs font-mono text-fg">
        {children}
      </code>
    );
  }

  // Block code — rendered by the `pre` override below, so we own the full container
  return (
    <div className="group relative my-3 rounded-xl border border-line-strong bg-surface overflow-hidden">
      <button
        onClick={handleCopy}
        className="absolute top-2.5 right-2.5 z-10 rounded-lg bg-hover p-1.5 text-secondary opacity-0 group-hover:opacity-100 hover:bg-hover hover:text-fg transition-all"
        title={copied ? "Copied!" : "Copy"}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed bg-neutral-900 m-0">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

function processCitations(children: React.ReactNode, citations: MessageSourceMetadata[]): React.ReactNode {
  if (Array.isArray(children)) {
    return children.map((child, i) =>
      typeof child === "string"
        ? <span key={i}>{processCitations(child, citations)}</span>
        : child
    );
  }
  if (typeof children !== "string") return children;
  const parts = children.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      const url = citations[parseInt(match[1], 10) - 1]?.source;
      const badge = (
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white mx-0.5 translate-y-[-1px]">
          {match[1]}
        </span>
      );
      return url ? (
        <button key={i} onClick={() => window.electronAPI.openExternal(url)} className="cursor-pointer hover:opacity-75 transition-opacity">
          {badge}
        </button>
      ) : (
        <span key={i}>{badge}</span>
      );
    }
    return part;
  });
}

function makeMdComponents(citations: MessageSourceMetadata[]) {
  return {
    // react-markdown wraps block code in <pre><code>. Overriding `pre` to a
    // fragment lets CodeBlock own the entire container (avoids <div> inside
    // <pre>, which browsers reject and which broke the block rendering).
    pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    code: CodeBlock as any,
    a: ({ href, children }: any) => (
      <a
        href={href}
        onClick={(e) => { e.preventDefault(); href && window.electronAPI.openExternal(href); }}
        className="text-primary underline hover:text-emerald-400 transition-colors cursor-pointer"
      >
        {children}
      </a>
    ),
    p: ({ children }: any) => (
      <p className="mb-2 last:mb-0">{processCitations(children, citations)}</p>
    ),
    // Tight lists render text directly in <li> without a <p> wrapper,
    // so we also need to process citations here.
    li: ({ children, ...props }: any) => (
      <li {...props}>{processCitations(children, citations)}</li>
    ),
  };
}

export function MessageBubble({ message, isStreaming, onRetry }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const sources = message.sources ?? [];
  const citations = flattenCitations(sources);
  const mdComponents = makeMdComponents(citations);
  const [userCopied, setUserCopied] = useState(false);

  const handleCopyUserMessage = useCallback(() => {
    if (message.content) {
      navigator.clipboard.writeText(message.content).then(() => {
        setUserCopied(true);
        setTimeout(() => setUserCopied(false), 1500);
      });
    }
  }, [message.content]);

  if (isUser) {
    return (
      <div className="group flex justify-end px-4 py-1">
        <div className="relative max-w-[75%]">
          {/* Copy button */}
          {message.content && (
            <button
              onClick={handleCopyUserMessage}
              className="absolute -left-8 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-secondary opacity-0 group-hover:opacity-100 hover:bg-hover hover:text-fg transition-all"
              title={userCopied ? "Copied!" : "Copy"}
            >
              {userCopied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          )}

          {/* User text */}
          {message.content && (
            <div className="rounded-2xl rounded-br-sm bg-bubble px-4 py-2.5 text-sm text-fg selectable">
              {message.content}
            </div>
          )}

          {/* Attached images */}
          {message.files?.filter((f) => f.type === "image").map((file, i) => (
            <img
              key={i}
              src={file.dataUrl ?? file.uri}
              alt={file.name ?? "attachment"}
              className="mt-2 max-w-full rounded-xl border border-line-strong"
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
                return <ThinkingBlock key={i} entry={seg.entry} isStreaming={isStreaming} />;
              }
              return seg.text ? (
                <div key={i} className="text-sm text-neutral-100 selectable markdown">
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
          <div className="text-sm text-neutral-100 selectable markdown">
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
        {citations.length > 0 && (
          <MessageSources sources={sources} />
        )}

        {/* Actions */}
        {!isStreaming && (
          <MessageActions content={content} info={message.info} onRetry={onRetry} />
        )}
      </div>
    </div>
  );
}
