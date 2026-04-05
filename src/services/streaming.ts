import EventSource from "react-native-sse";
import type { Socket } from "socket.io-client";
import type { ChatCompletionRequest, ChatCompletionChunk, StreamingStatus } from "@/lib/types";
import { API_PATHS } from "@/lib/constants";
import { getSocket, getSessionId } from "./socket";

interface StreamCallbacks {
  onToken: (token: string) => void;
  onStatus: (status: StreamingStatus) => void;
  onDone: () => void;
  onError: (error: Error) => void;
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
      // Replace events send the full content — already streamed via deltas
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
      const chunk: ChatCompletionChunk = JSON.parse(event.data);
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        callbacks.onToken(content);
      }

      if (chunk.choices[0]?.finish_reason === "stop") {
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
