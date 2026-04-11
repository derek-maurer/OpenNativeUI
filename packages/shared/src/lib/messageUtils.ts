import { parseReasoningSegments, hasReasoningContent } from "./reasoningParser";

/**
 * Strip reasoning/thinking blocks from message content so the result
 * matches only the visible answer text (e.g. for clipboard copy).
 */
export function extractPlainContent(content: string): string {
  if (!hasReasoningContent(content)) return content;
  const segments = parseReasoningSegments(content);
  if (!segments) return content;
  return segments
    .filter((s): s is { kind: "text"; text: string } => s.kind === "text")
    .map((s) => s.text)
    .join("")
    .trim();
}

/**
 * Strip markdown syntax for text-to-speech so the spoken result is clean.
 * Replaces code blocks with a verbal label and removes formatting characters.
 */
export function stripMarkdownForSpeech(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[#*_~>\[\]()!|]/g, "")
    .replace(/\n+/g, " ")
    .trim();
}
