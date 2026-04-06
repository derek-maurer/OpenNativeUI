import type { ThinkingLevel } from "@/lib/types";

/**
 * Describes how a model exposes its "thinking" / reasoning feature.
 *
 * - `none`   — model does not support thinking, no UI is shown.
 * - `binary` — thinking is a simple on/off toggle (e.g. Gemma 3+).
 *              The request sends `think: true` when enabled.
 * - `tiered` — thinking has discrete effort levels (e.g. GPT-OSS).
 *              The request sends `think: "low" | "medium" | "high"`.
 */
export type ThinkingCapability =
  | { mode: "none" }
  | { mode: "binary" }
  | { mode: "tiered"; levels: ThinkingLevel[] };

export interface ModelCapabilities {
  thinking: ThinkingCapability;
}

interface ModelLibraryEntry {
  /** Human-readable label for the family — used for debugging / future UI. */
  label: string;
  /** Regex tested against the lowercased model id. */
  match: RegExp;
  capabilities: ModelCapabilities;
}

/**
 * Library of known model families and their capabilities.
 *
 * To add a new model: append an entry below. The first matching entry wins,
 * so put more specific patterns before broader ones.
 */
const MODEL_LIBRARY: ModelLibraryEntry[] = [
  {
    label: "GPT-OSS",
    match: /gpt-oss/,
    capabilities: {
      thinking: { mode: "tiered", levels: ["low", "medium", "high"] },
    },
  },
  {
    label: "Gemma 3+",
    // Matches gemma3, gemma-3, gemma4, gemma-4, ... through gemma9.
    match: /gemma[-]?[3-9]/,
    capabilities: {
      thinking: { mode: "binary" },
    },
  },
];

const DEFAULT_CAPABILITIES: ModelCapabilities = {
  thinking: { mode: "none" },
};

/**
 * Look up the capabilities for a given model id. Returns a safe default
 * (no special features) when the model is unknown or null.
 */
export function getModelCapabilities(
  modelId: string | null | undefined,
): ModelCapabilities {
  if (!modelId) return DEFAULT_CAPABILITIES;
  const lower = modelId.toLowerCase();
  for (const entry of MODEL_LIBRARY) {
    if (entry.match.test(lower)) return entry.capabilities;
  }
  return DEFAULT_CAPABILITIES;
}
