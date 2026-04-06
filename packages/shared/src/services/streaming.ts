import EventSource from "react-native-sse";
import type { Socket } from "socket.io-client";
import type {
  ChatCompletionRequest,
  ChatCompletionChunk,
  StreamingStatus,
  MessageSource,
} from "../lib/types";
import { API_PATHS } from "../lib/constants";
import { getSocket, getSessionId } from "./socket";

interface StreamCallbacks {
  onToken: (token: string) => void;
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

    // Streaming content chunks
    if (type === "chat:message:delta" || type === "message") {
      const inner = (data.data ?? data) as Record<string, unknown>;
      const content = inner.content as string | undefined;
      if (content) {
        callbacks.onToken(content);
      }

      // Check for done flag on delta events
      if (inner.done === true) {
        finish();
        return;
      }
    }

    // Full message replacement (end of stream in some flows)
    if (type === "chat:message" || type === "replace") {
      const inner = (data.data ?? data) as Record<string, unknown>;
      if (inner.done === true) {
        finish();
        return;
      }
    }

    // Completion event — stream is done
    if (type === "chat:completion") {
      const inner = (data.data ?? data) as Record<string, unknown>;
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

  // Listen BEFORE posting so we don't miss early events
  socket.on("events", handleEvent);

  // POST the request — server returns { status: true, task_id: ... }
  fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...body,
      stream: true,
      session_id: sessionId,
    }),
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
 * SSE fallback — original EventSource-based streaming.
 * Used when Socket.IO is not connected.
 */
function streamViaSSE(
  serverUrl: string,
  token: string,
  body: ChatCompletionRequest,
  callbacks: StreamCallbacks
): { abort: () => void } {
  const url = `${serverUrl.replace(/\/+$/, "")}${API_PATHS.CHAT_COMPLETIONS}`;

  const es = new EventSource(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({ ...body, stream: true }),
    pollingInterval: 0,
  });

  es.addEventListener("message", (event: any) => {
    if (!event.data) return;

    if (event.data === "[DONE]") {
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
      };

      const content = frame.choices?.[0]?.delta?.content;
      if (content) {
        callbacks.onToken(content);
      }

      if (Array.isArray(frame.sources) && frame.sources.length > 0) {
        callbacks.onSources(frame.sources);
      }

      if (frame.choices?.[0]?.finish_reason === "stop") {
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
