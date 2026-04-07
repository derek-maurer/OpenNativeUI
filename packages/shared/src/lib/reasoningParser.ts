/**
 * Parses reasoning/thinking content out of assistant messages.
 *
 * Open WebUI's backend wraps model reasoning in HTML `<details>` blocks
 * before sending it to the frontend, so a fully-formed assistant message
 * looks like:
 *
 *   <details type="reasoning" done="true" duration="12">
 *   <summary>Thought for 12 seconds</summary>
 *   &gt; let me think about this...
 *   </details>
 *   Here is the answer.
 *
 * During streaming, the `done` flag is "false" and the closing `</details>`
 * may not have arrived yet. We must tolerate both.
 *
 * This is a TypeScript port of the Dart implementation in
 * conduit/lib/core/utils/reasoning_parser.dart, which in turn mirrors the
 * logic in the Svelte frontend's marked extension
 * (openwebui/src/lib/utils/marked/extension.ts) and the backend middleware's
 * DEFAULT_REASONING_TAGS list
 * (openwebui/backend/open_webui/utils/middleware.py).
 */

export type BlockType = "reasoning" | "code_interpreter";

export interface ReasoningEntry {
  reasoning: string;
  summary: string;
  duration: number;
  isDone: boolean;
  blockType: BlockType;
}

export type ReasoningSegment =
  | { kind: "text"; text: string }
  | { kind: "reasoning"; entry: ReasoningEntry };

/**
 * Raw `<think>…</think>`-style tag pairs that some models emit directly.
 * Mirrors DEFAULT_REASONING_TAGS in the Open WebUI backend.
 */
const DEFAULT_REASONING_TAG_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["<think>", "</think>"],
  ["<thinking>", "</thinking>"],
  ["<reason>", "</reason>"],
  ["<reasoning>", "</reasoning>"],
  ["<thought>", "</thought>"],
  ["<Thought>", "</Thought>"],
  ["<|begin_of_thought|>", "<|end_of_thought|>"],
  ["◁think▷", "◁/think▷"],
];

const REASONING_SUMMARY_PATTERN = /thought|thinking|reasoning/i;

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

function unescapeHtml(input: string): string {
  if (!input) return input;
  return input.replace(
    /&(amp|lt|gt|quot|#39|apos|nbsp|#\d+);/g,
    (match) => {
      const mapped = HTML_ENTITIES[match];
      if (mapped !== undefined) return mapped;
      const numericMatch = match.match(/^&#(\d+);$/);
      if (numericMatch) {
        return String.fromCodePoint(parseInt(numericMatch[1], 10));
      }
      return match;
    },
  );
}

/**
 * Strip the leading `> ` blockquote markers the backend adds to each
 * reasoning line before display. Mirrors `cleanedReasoning` on conduit's
 * ReasoningEntry.
 */
export function cleanReasoningText(raw: string): string {
  return raw
    .split("\n")
    .map((line) => {
      if (line.startsWith("> ")) return line.slice(2);
      if (line.startsWith(">")) return line.slice(1);
      return line;
    })
    .join("\n")
    .trim();
}

/**
 * Humanised duration string matching Open WebUI's dayjs-backed labels.
 * Reference: openwebui/src/lib/components/common/Collapsible.svelte.
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 1) {
    return "less than a second";
  }
  if (seconds < 60) {
    return `${seconds} second${seconds === 1 ? "" : "s"}`;
  }
  if (seconds < 90) return "a minute";
  if (seconds < 2700) {
    // 45 minutes
    const minutes = Math.round(seconds / 60);
    return `${minutes} minutes`;
  }
  if (seconds < 5400) return "about an hour"; // 90 minutes
  if (seconds < 79200) {
    // 22 hours
    const hours = Math.round(seconds / 3600);
    return `${hours} hours`;
  }
  if (seconds < 129600) return "a day"; // 36 hours
  const days = Math.round(seconds / 86400);
  return `${days} days`;
}

/**
 * Quick gate so MessageBubble can avoid the segmenter's regex work for
 * messages that clearly have no reasoning content.
 */
export function hasReasoningContent(content: string): boolean {
  if (!content) return false;
  if (/<details[^>]*type="reasoning"/i.test(content)) return true;
  if (/<details[^>]*type="code_interpreter"/i.test(content)) return true;
  if (content.includes("<details")) {
    const summaryMatch = content.match(/<summary>([^<]*)<\/summary>/i);
    if (summaryMatch && REASONING_SUMMARY_PATTERN.test(summaryMatch[1])) {
      return true;
    }
  }
  for (const [start] of DEFAULT_REASONING_TAG_PAIRS) {
    if (content.includes(start)) return true;
  }
  return false;
}

interface SummaryExtractionResult {
  summary: string;
  remaining: string;
}

function extractSummary(content: string): SummaryExtractionResult {
  const match = content.match(/^\s*<summary>([\s\S]*?)<\/summary>\s*/i);
  if (match) {
    return {
      summary: (match[1] ?? "").trim(),
      remaining: content.slice(match[0].length).trim(),
    };
  }
  return { summary: "", remaining: content.trim() };
}

/**
 * Extract `(1s)`, `(2m 30s)`, `(5m)` style durations from an existing
 * summary string — used when the server didn't include a `duration=` attr.
 */
function extractDurationFromSummary(summary: string): number {
  // Order matters: try the `(Xm[ Ys])` form first.
  const minutesMatch = summary.match(/\((\d+)m(?:\s*(\d+)s)?\)/i);
  if (minutesMatch) {
    const minutes = parseInt(minutesMatch[1] ?? "0", 10) || 0;
    const seconds = parseInt(minutesMatch[2] ?? "0", 10) || 0;
    return minutes * 60 + seconds;
  }
  const secondsMatch = summary.match(/\((\d+)s\)/i);
  if (secondsMatch) {
    return parseInt(secondsMatch[1] ?? "0", 10) || 0;
  }
  return 0;
}

interface DetailsResult {
  entry: ReasoningEntry;
  endIndex: number;
  isComplete: boolean;
  isReasoning: boolean;
}

/**
 * Parse a `<details>…</details>` block, tolerating nested details and
 * unterminated streaming blocks. Mirrors conduit's _parseDetailsBlock.
 */
function parseDetailsBlock(content: string, startIdx: number): DetailsResult {
  const openTagEnd = content.indexOf(">", startIdx);
  if (openTagEnd === -1) {
    // Opening tag hasn't finished arriving yet — treat as an empty,
    // in-progress reasoning block so the UI can already show "Thinking…".
    return {
      entry: {
        reasoning: "",
        summary: "",
        duration: 0,
        isDone: false,
        blockType: "reasoning",
      },
      endIndex: content.length,
      isComplete: false,
      isReasoning: true,
    };
  }

  const openTag = content.slice(startIdx, openTagEnd + 1);
  const attrs: Record<string, string> = {};
  for (const attrMatch of openTag.matchAll(/(\w+)="(.*?)"/g)) {
    attrs[attrMatch[1]] = attrMatch[2] ?? "";
  }

  const type = (attrs.type ?? "").toLowerCase();
  const isDone = attrs.done === "true";
  const duration = parseInt(attrs.duration ?? "0", 10) || 0;
  const blockType: BlockType =
    type === "code_interpreter" ? "code_interpreter" : "reasoning";

  // Walk forward to find the matching </details>, respecting nesting.
  let depth = 1;
  let i = openTagEnd + 1;
  while (i < content.length && depth > 0) {
    const nextOpen = content.indexOf("<details", i);
    const nextClose = content.indexOf("</details>", i);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      i = nextOpen + "<details".length;
    } else {
      depth -= 1;
      i = nextClose + "</details>".length;
    }
  }

  const isComplete = depth === 0;
  const innerRaw = isComplete
    ? content.slice(openTagEnd + 1, i - "</details>".length)
    : content.slice(openTagEnd + 1);
  const { summary, remaining } = extractSummary(innerRaw);
  const effectiveDuration =
    duration > 0 ? duration : extractDurationFromSummary(summary);

  const summaryLooksReasoning = REASONING_SUMMARY_PATTERN.test(summary);
  const isReasoning =
    type === "reasoning" ||
    type === "code_interpreter" ||
    (type === "" && summaryLooksReasoning);

  return {
    entry: {
      reasoning: unescapeHtml(remaining),
      summary: unescapeHtml(summary),
      duration: effectiveDuration,
      isDone: isComplete ? isDone : false,
      blockType,
    },
    endIndex: isComplete ? i : content.length,
    isComplete,
    isReasoning,
  };
}

interface RawReasoningResult {
  entry: ReasoningEntry;
  endIndex: number;
  isComplete: boolean;
}

/**
 * Parse a raw tag-pair reasoning block (e.g. `<think>…</think>`).
 * Handles optional attributes on the opening tag.
 */
function parseRawReasoning(
  content: string,
  startIdx: number,
  startTag: string,
  endTag: string,
): RawReasoningResult {
  let contentStartIdx: number;
  const startsWithAngle = startTag.startsWith("<") && startTag.endsWith(">");
  if (startsWithAngle) {
    const tagCloseIdx = content.indexOf(">", startIdx);
    if (tagCloseIdx === -1) {
      return {
        entry: {
          reasoning: "",
          summary: "",
          duration: 0,
          isDone: false,
          blockType: "reasoning",
        },
        endIndex: content.length,
        isComplete: false,
      };
    }
    contentStartIdx = tagCloseIdx + 1;
  } else {
    contentStartIdx = startIdx + startTag.length;
  }

  const endIdx = content.indexOf(endTag, contentStartIdx);
  if (endIdx === -1) {
    return {
      entry: {
        reasoning: unescapeHtml(content.slice(contentStartIdx).trim()),
        summary: "",
        duration: 0,
        isDone: false,
        blockType: "reasoning",
      },
      endIndex: content.length,
      isComplete: false,
    };
  }

  return {
    entry: {
      reasoning: unescapeHtml(content.slice(contentStartIdx, endIdx).trim()),
      summary: "",
      duration: 0,
      isDone: true,
      blockType: "reasoning",
    },
    endIndex: endIdx + endTag.length,
    isComplete: true,
  };
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Split an assistant message into ordered text and reasoning segments.
 * Returns null if the message has no parseable content at all.
 *
 * Segments preserve original order, so a message like
 * `intro <details>…</details> outro` yields
 * `[text, reasoning, text]`.
 */
export function parseReasoningSegments(
  content: string,
): ReasoningSegment[] | null {
  if (!content) return null;

  const segments: ReasoningSegment[] = [];
  let index = 0;

  while (index < content.length) {
    const remaining = content.slice(index);

    // Find the next <details tag (any type; reasoning-ness determined later).
    const detailsMatch = remaining.match(/<details(?:\s|>)/);
    const nextDetailsIdx =
      detailsMatch && detailsMatch.index !== undefined
        ? index + detailsMatch.index
        : -1;

    // Find the earliest raw-tag match.
    let nextRawIdx = -1;
    let matchedRawPair: readonly [string, string] | null = null;
    for (const pair of DEFAULT_REASONING_TAG_PAIRS) {
      const [startTag] = pair;
      let idx = -1;
      if (startTag.startsWith("<") && startTag.endsWith(">")) {
        const tagName = startTag.slice(1, -1);
        const pattern = new RegExp(`<${escapeRegExp(tagName)}(\\s[^>]*)?>`);
        const match = remaining.match(pattern);
        if (match && match.index !== undefined) {
          idx = index + match.index;
        }
      } else {
        const found = content.indexOf(startTag, index);
        if (found !== -1) idx = found;
      }
      if (idx !== -1 && (nextRawIdx === -1 || idx < nextRawIdx)) {
        nextRawIdx = idx;
        matchedRawPair = pair;
      }
    }

    // Nothing left to process — flush the remaining text and exit.
    if (nextDetailsIdx === -1 && nextRawIdx === -1) {
      const tail = content.slice(index);
      if (tail.length > 0) {
        segments.push({ kind: "text", text: tail });
      }
      break;
    }

    let nextIdx: number;
    let kind: "details" | "raw";
    if (
      nextDetailsIdx !== -1 &&
      (nextRawIdx === -1 || nextDetailsIdx <= nextRawIdx)
    ) {
      nextIdx = nextDetailsIdx;
      kind = "details";
    } else {
      nextIdx = nextRawIdx;
      kind = "raw";
    }

    // Emit any plain text that preceded this block.
    if (nextIdx > index) {
      const textBefore = content.slice(index, nextIdx);
      if (textBefore.length > 0) {
        segments.push({ kind: "text", text: textBefore });
      }
    }

    if (kind === "details") {
      const result = parseDetailsBlock(content, nextIdx);
      if (result.isReasoning) {
        segments.push({ kind: "reasoning", entry: result.entry });
      } else {
        // Not reasoning — keep the raw HTML as text so markdown can handle it.
        const detailsText = content.slice(nextIdx, result.endIndex);
        if (detailsText.length > 0) {
          segments.push({ kind: "text", text: detailsText });
        }
      }
      if (!result.isComplete) break;
      index = result.endIndex;
    } else if (kind === "raw" && matchedRawPair) {
      const result = parseRawReasoning(
        content,
        nextIdx,
        matchedRawPair[0],
        matchedRawPair[1],
      );
      segments.push({ kind: "reasoning", entry: result.entry });
      if (!result.isComplete) break;
      index = result.endIndex;
    }
  }

  return segments.length === 0 ? null : segments;
}
