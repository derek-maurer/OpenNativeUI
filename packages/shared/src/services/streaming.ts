import type { Socket } from "socket.io-client";
import { createSSEConnection } from "../lib/sse";
import type {
  ChatCompletionRequest,
  ChatCompletionChunk,
  StreamingStatus,
  MessageSource,
} from "../lib/types";
import { API_PATHS } from "../lib/constants";
import { getSocket, getSessionId } from "./socket";

interface StreamCallbacks {
  /**
   * Incremental plain-text token from the model. Consumers should append
   * this to whatever visible buffer they are maintaining. Used on the
   * fast path when nothing non-textual (reasoning, details blocks, etc.)
   * is active.
   */
  onToken: (token: string) => void;
  /**
   * Full-content replacement. Used whenever the streaming layer needs to
   * rewrite the entire assistant message — for example, when the backend
   * sends a server-authored `<details type="reasoning">` block inline in
   * `chat:completion.data.content`, or when our SSE path rebuilds a
   * live-growing reasoning block locally from `delta.reasoning_content`.
   */
  onReplaceContent: (content: string) => void;
  onStatus: (status: StreamingStatus) => void;
  onSources: (sources: MessageSource[]) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

/**
 * Open WebUI emits RAG/web-search sources as a sibling field to `content`
 * on chat completion frames (see docs/open-webui-api-reference.md:229).
 * This helper extracts the `sources` array from whichever envelope the
 * current frame happens to be — it can live on `data.sources` (top-level)
 * or on `data.data.sources` (wrapped).
 */
function extractSources(
  data: Record<string, unknown>,
  inner: Record<string, unknown>,
): MessageSource[] | null {
  const fromInner = inner.sources;
  if (Array.isArray(fromInner) && fromInner.length > 0) {
    return fromInner as MessageSource[];
  }
  const fromTop = data.sources;
  if (Array.isArray(fromTop) && fromTop.length > 0) {
    return fromTop as MessageSource[];
  }
  return null;
}

export function streamChatCompletion(
  serverUrl: string,
  token: string,
  body: ChatCompletionRequest,
  callbacks: StreamCallbacks
): { abort: () => void } {
  const socket = getSocket();
  const sessionId = getSessionId();

  if (socket?.connected && sessionId) {
    return streamViaSocket(serverUrl, token, body, sessionId, socket, callbacks);
  }

  return streamViaSSE(serverUrl, token, body, callbacks);
}

/**
 * Socket.IO streaming — matches the Open WebUI web frontend.
 * POST initiates the task, streaming content arrives via Socket.IO events.
 *
 * The backend emits `chat:completion` events whose `data.content` holds the
 * FULL serialized assistant message (including any live `<details
 * type="reasoning" done="false">` block the middleware has built so far).
 * Per openwebui/backend/open_webui/utils/middleware.py ~L3797 / L3954,
 * that content is rebuilt from scratch on every delta — so we must REPLACE
 * rather than APPEND whenever this field is present. The fallback
 * `choices[0].delta.content` path still uses append semantics for servers
 * that don't wrap their stream in the event_emitter middleware.
 */
function streamViaSocket(
  serverUrl: string,
  token: string,
  body: ChatCompletionRequest,
  sessionId: string,
  socket: Socket,
  callbacks: StreamCallbacks
): { abort: () => void } {
  const url = `${serverUrl.replace(/\/+$/, "")}${API_PATHS.CHAT_COMPLETIONS}`;
  let aborted = false;
  let done = false;

  const chatId = body.chat_id;

  const cleanup = () => {
    socket.off("events", handleEvent);
    socket.off("chat-events", handleEvent);
  };

  const finish = () => {
    if (done) return;
    done = true;
    cleanup();
    callbacks.onDone();
  };

  const handleEvent = (event: {
    chat_id?: string;
    message_id?: string;
    data?: Record<string, unknown>;
  }) => {
    if (aborted || done) return;
    if (event.chat_id !== chatId) return;

    const data = event.data;
    if (!data) return;

    const type = data.type as string | undefined;

    // Sources can arrive either piggy-backed on delta/completion events OR
    // as a standalone event with its own `type`. Check up front so we catch
    // every variant regardless of which branch the event ultimately matches.
    {
      const innerProbe = (data.data ?? data) as Record<string, unknown>;
      const sources = extractSources(data, innerProbe);
      if (sources) {
        callbacks.onSources(sources);
      }
    }

    // Status/progress updates (web search, RAG, image gen, tools, etc.)
    if (type === "status") {
      const inner = (data.data ?? data) as Record<string, unknown>;
      callbacks.onStatus({
        action: inner.action as string | undefined,
        description: (inner.description as string) ?? "",
        done: (inner.done as boolean) ?? false,
      });
      return;
    }

    // The main event stream: every delta arrives as a `chat:completion`
    // envelope whose `data.content` holds the full rebuilt assistant
    // message. When the backend serializes reasoning output into a
    // `<details>` block it is already embedded in this content string, so
    // replacing wholesale is exactly what we want. On some edge paths the
    // inner shape is OpenAI-native (`choices[0].delta.content`) — we treat
    // that as an incremental token for append semantics.
    if (type === "chat:completion") {
      const inner = (data.data ?? data) as Record<string, unknown>;

      const fullContent = inner.content;
      if (typeof fullContent === "string") {
        callbacks.onReplaceContent(fullContent);
      } else {
        const choices = inner.choices as Array<Record<string, unknown>> | undefined;
        const delta = choices?.[0]?.delta as Record<string, unknown> | undefined;
        const deltaContent = delta?.content;
        if (typeof deltaContent === "string" && deltaContent.length > 0) {
          callbacks.onToken(deltaContent);
        }
      }

      if (inner.done === true) {
        finish();
        return;
      }
    }

    // Legacy streaming envelopes kept for compatibility with older
    // Open WebUI server versions and self-hosted forks that still emit
    // `chat:message:delta` / `message`. New servers send `chat:completion`.
    if (type === "chat:message:delta" || type === "message") {
      const inner = (data.data ?? data) as Record<string, unknown>;
      const content = inner.content as string | undefined;
      if (content) {
        callbacks.onToken(content);
      }
      if (inner.done === true) {
        finish();
        return;
      }
    }

    // Full message replacement (end of stream in some flows)
    if (type === "chat:message" || type === "replace") {
      const inner = (data.data ?? data) as Record<string, unknown>;
      const replacement = inner.content;
      if (typeof replacement === "string") {
        callbacks.onReplaceContent(replacement);
      }
      if (inner.done === true) {
        finish();
        return;
      }
    }

    // Top-level done flag (some server versions)
    if (data.done === true) {
      finish();
    }
  };

  // Listen BEFORE posting so we don't miss early events. Register on both
  // `events` and `chat-events` — conduit and newer Open WebUI versions can
  // emit on either channel and we want to catch both.
  socket.on("events", handleEvent);
  socket.on("chat-events", handleEvent);

  const requestPayload = {
    ...body,
    stream: true,
    session_id: sessionId,
  };
  console.log("[chat:wire] POST (socket)", {
    url,
    bodyKeys: Object.keys(requestPayload),
    params: (requestPayload as { params?: unknown }).params ?? null,
    body: JSON.stringify(requestPayload),
  });

  // POST the request — server returns { status: true, task_id: ... }
  fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestPayload),
  })
    .then(async (res) => {
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          (errorData as { detail?: string })?.detail ?? `HTTP ${res.status}`
        );
      }
      // JSON response acknowledged — streaming continues via Socket.IO
    })
    .catch((error) => {
      if (!aborted && !done) {
        cleanup();
        callbacks.onError(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    });

  return {
    abort: () => {
      aborted = true;
      cleanup();
    },
  };
}

/**
 * HTML-escape reasoning content for embedding inside a `<details>` block,
 * matching the backend middleware's escaping of the raw text.
 */
function escapeReasoningForDetails(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Build a `<details type="reasoning">` block the same way the backend
 * middleware does in openwebui/backend/open_webui/utils/middleware.py
 * (the `elif item_type == 'reasoning':` branch). Each reasoning line is
 * prefixed with `> ` to render as a blockquote after the HTML is piped
 * through the markdown renderer.
 */
function buildStreamingReasoningDetails(
  reasoning: string,
  { done, duration }: { done: boolean; duration: number },
): string {
  const trimmed = reasoning.trim();
  const escapedDisplay =
    trimmed.length === 0
      ? ""
      : escapeReasoningForDetails(
          trimmed
            .split("\n")
            .map((line) => (line.startsWith(">") ? line : `> ${line}`))
            .join("\n"),
        );
  if (done) {
    return (
      `<details type="reasoning" done="true" duration="${duration}">\n` +
      `<summary>Thought for ${duration} seconds</summary>\n` +
      `${escapedDisplay}\n` +
      `</details>\n`
    );
  }
  return (
    `<details type="reasoning" done="false">\n` +
    `<summary>Thinking…</summary>\n` +
    `${escapedDisplay}\n` +
    `</details>\n`
  );
}

function joinReasoningAndPrefix(prefix: string, reasoningDetails: string): string {
  if (prefix.length === 0 || prefix.endsWith("\n")) {
    return `${prefix}${reasoningDetails}`;
  }
  return `${prefix}\n${reasoningDetails}`;
}

/**
 * SSE fallback — original EventSource-based streaming.
 * Used when Socket.IO is not connected.
 *
 * Unlike the socket path (where the backend middleware pre-bakes reasoning
 * into the `content` field), the SSE path talks to the raw
 * `/api/chat/completions` stream which emits OpenAI-compatible chunks with
 * a separate `delta.reasoning_content` field. We accumulate those into a
 * local `<details>` block and push the whole thing via `onReplaceContent`
 * so the rest of the pipeline stays unaware of where reasoning came from.
 */
function streamViaSSE(
  serverUrl: string,
  token: string,
  body: ChatCompletionRequest,
  callbacks: StreamCallbacks
): { abort: () => void } {
  const url = `${serverUrl.replace(/\/+$/, "")}${API_PATHS.CHAT_COMPLETIONS}`;

  // Emit synthetic status events for features that require pre-token server-side
  // processing (web search, RAG). These mirror what the Socket.IO path receives
  // as real `status` events, but since the SSE stream carries no status frames
  // we infer them from the request body. They resolve on the first visible token.
  const syntheticActions: string[] = [];
  if ((body.features as Record<string, unknown> | undefined)?.web_search) {
    syntheticActions.push("web_search");
    callbacks.onStatus({ action: "web_search", description: "Searching the web...", done: false });
  }
  if (body.files && body.files.length > 0) {
    syntheticActions.push("knowledge_search");
    callbacks.onStatus({ action: "knowledge_search", description: "Searching knowledge base...", done: false });
  }

  let syntheticResolved = false;
  const resolveSyntheticStatuses = () => {
    if (syntheticResolved) return;
    syntheticResolved = true;
    const labels: Record<string, string> = {
      web_search: "Web search complete",
      knowledge_search: "Knowledge base searched",
    };
    for (const action of syntheticActions) {
      callbacks.onStatus({ action, description: labels[action] ?? action, done: true });
    }
  };

  let renderedContent = "";
  let inReasoningBlock = false;
  let reasoningPrefix = "";
  let reasoningBuffer = "";
  let reasoningStartTime = 0;

  const resetReasoning = () => {
    inReasoningBlock = false;
    reasoningPrefix = "";
    reasoningBuffer = "";
    reasoningStartTime = 0;
  };

  const appendVisibleChunk = (chunk: string) => {
    if (!chunk) return;
    resolveSyntheticStatuses();
    if (inReasoningBlock) {
      // Plain text coming after a reasoning block closes the reasoning
      // segment — finalize it with the elapsed duration, then append the
      // new chunk as normal prose. Mirrors conduit's
      // appendVisibleAssistantChunk in streaming_helper.dart.
      const duration = Math.max(
        0,
        Math.round((Date.now() - reasoningStartTime) / 1000),
      );
      renderedContent =
        joinReasoningAndPrefix(
          reasoningPrefix,
          buildStreamingReasoningDetails(reasoningBuffer, {
            done: true,
            duration,
          }),
        ) + chunk;
      resetReasoning();
      callbacks.onReplaceContent(renderedContent);
    } else {
      renderedContent += chunk;
      callbacks.onToken(chunk);
    }
  };

  const appendReasoningChunk = (chunk: string) => {
    if (!chunk) return;
    resolveSyntheticStatuses();
    if (!inReasoningBlock) {
      inReasoningBlock = true;
      reasoningPrefix = renderedContent;
      reasoningBuffer = "";
      reasoningStartTime = Date.now();
    }
    reasoningBuffer += chunk;
    renderedContent = joinReasoningAndPrefix(
      reasoningPrefix,
      buildStreamingReasoningDetails(reasoningBuffer, {
        done: false,
        duration: 0,
      }),
    );
    callbacks.onReplaceContent(renderedContent);
  };

  const finalizeReasoningIfOpen = () => {
    if (!inReasoningBlock) return;
    const duration = Math.max(
      0,
      Math.round((Date.now() - reasoningStartTime) / 1000),
    );
    renderedContent = joinReasoningAndPrefix(
      reasoningPrefix,
      buildStreamingReasoningDetails(reasoningBuffer, {
        done: true,
        duration,
      }),
    );
    resetReasoning();
    callbacks.onReplaceContent(renderedContent);
  };

  const ssePayload = { ...body, stream: true };
  console.log("[chat:wire] POST (sse)", {
    url,
    bodyKeys: Object.keys(ssePayload),
    params: (ssePayload as { params?: unknown }).params ?? null,
    body: JSON.stringify(ssePayload),
  });

  const es = createSSEConnection(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(ssePayload),
  });

  es.addEventListener("message", (event: any) => {
    if (!event.data) return;

    if (event.data === "[DONE]") {
      finalizeReasoningIfOpen();
      es.removeAllEventListeners();
      es.close();
      callbacks.onDone();
      return;
    }

    try {
      // Parse loosely — per docs/open-webui-api-reference.md:229 the stream
      // interleaves OpenAI-shaped chunks (`choices[]`) with sidecar frames
      // like `{"sources": [...]}` and `{"usage": {...}}` that do NOT have
      // `choices`. The old typed cast crashed on those and they got swallowed.
      const frame = JSON.parse(event.data) as Partial<ChatCompletionChunk> & {
        sources?: MessageSource[];
        choices?: Array<{
          delta?: {
            content?: string;
            reasoning_content?: string;
            // Some providers (Anthropic-compat, Ollama) use alternate names.
            reasoning?: string;
            thinking?: string;
          };
          finish_reason?: string | null;
        }>;
      };

      const delta = frame.choices?.[0]?.delta;
      if (delta) {
        const reasoningChunk =
          delta.reasoning_content ?? delta.reasoning ?? delta.thinking;
        if (typeof reasoningChunk === "string" && reasoningChunk.length > 0) {
          appendReasoningChunk(reasoningChunk);
        }

        const contentChunk = delta.content;
        if (typeof contentChunk === "string" && contentChunk.length > 0) {
          appendVisibleChunk(contentChunk);
        }
      }

      if (Array.isArray(frame.sources) && frame.sources.length > 0) {
        callbacks.onSources(frame.sources);
      }

      if (frame.choices?.[0]?.finish_reason === "stop") {
        finalizeReasoningIfOpen();
        es.removeAllEventListeners();
        es.close();
        callbacks.onDone();
      }
    } catch (e) {
      // Skip malformed chunks
    }
  });

  es.addEventListener("error", (event: any) => {
    es.removeAllEventListeners();
    es.close();
    callbacks.onError(
      new Error(event?.message || "Streaming connection failed")
    );
  });

  return {
    abort: () => {
      es.removeAllEventListeners();
      es.close();
    },
  };
}
