import thinkingModelsConfig from "../config/thinkingModels.json";

/**
 * The serializable value of a single thinking option as it appears in the
 * JSON config and as it gets sent in the request body. Strings cover effort
 * tiers (`"low" | "medium" | "high"`) and booleans cover on/off toggles.
 */
export type ThinkingValue = string | boolean;

export interface ThinkingOption {
  /** Sent verbatim under `params[paramName]` in the chat completion request. */
  value: ThinkingValue;
  /** Human-readable label rendered in the options sheet. */
  label: string;
}

/**
 * One thinking-control "profile" — a family of models that share the same
 * UI control and the same backend parameter name. The first profile whose
 * `match` regexes hit the model id wins.
 */
export interface ThinkingProfile {
  id: string;
  label: string;
  /**
   * Open WebUI param name. `think` is forwarded to Ollama's root `think`
   * field; `reasoning_effort` is forwarded to OpenAI/Azure's top-level
   * `reasoning_effort` field. See open-webui/backend/open_webui/utils/payload.py.
   */
  paramName: string;
  options: ThinkingOption[];
  /**
   * The value the UI should show (and the request should send) for this
   * model family before the user picks anything. Once the user makes an
   * explicit selection it's persisted in modelPreferencesStore and that
   * value wins over this default on subsequent reads. Leave undefined to
   * mean "no preference" — the toggle/chips render in their inactive state
   * and no param is sent unless `offValue` overrides that.
   */
  defaultValue?: ThinkingValue;
  /**
   * Value to send when the user explicitly disables a single-option (toggle)
   * profile. Required for backends whose default is "on" — e.g. Ollama
   * models like Gemma 3+ keep thinking unless `think: false` is sent. When
   * omitted, "off" is expressed by not sending the param at all (provider
   * default), which is the right behavior for tiered effort controls.
   */
  offValue?: ThinkingValue;
}

interface RawProfile {
  id: string;
  label: string;
  match: string[];
  paramName: string;
  options: ThinkingOption[];
  defaultValue?: ThinkingValue;
  offValue?: ThinkingValue;
}

interface CompiledProfile extends ThinkingProfile {
  patterns: RegExp[];
}

const COMPILED_PROFILES: CompiledProfile[] = (
  thinkingModelsConfig.profiles as RawProfile[]
).map((profile) => ({
  ...profile,
  patterns: profile.match.map((pattern) => new RegExp(pattern, "i")),
}));

/**
 * Look up the thinking profile for a given model id, or `null` when the
 * model has no known thinking control. Match is case-insensitive and the
 * first profile whose patterns hit wins.
 */
export function getThinkingProfile(
  modelId: string | null | undefined,
): ThinkingProfile | null {
  if (!modelId) return null;
  for (const profile of COMPILED_PROFILES) {
    if (profile.patterns.some((re) => re.test(modelId))) {
      return profile;
    }
  }
  return null;
}

/**
 * Resolve the effective thinking value for a model given the profile and
 * whatever the user has previously stored. Precedence:
 *   1. Explicit user choice (`storedValue !== null`) — wins always.
 *   2. Profile `defaultValue` — JSON-defined starting point.
 *   3. Profile `offValue` — only relevant for default-on backends like
 *      Gemma where the visible "off" state must actively send `false`
 *      rather than omit the param.
 *   4. `null` — no param sent, provider default applies.
 *
 * The result is what the UI should reflect AND what the request should
 * send, so the toggle's visible state always matches the wire payload.
 */
export function resolveEffectiveThinkingValue(
  profile: ThinkingProfile | null,
  storedValue: ThinkingValue | null,
): ThinkingValue | null {
  if (storedValue !== null) return storedValue;
  if (!profile) return null;
  if (profile.defaultValue !== undefined) return profile.defaultValue;
  if (profile.offValue !== undefined) return profile.offValue;
  return null;
}
