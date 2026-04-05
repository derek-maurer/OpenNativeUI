import EventSource from "react-native-sse";
import type { ChatCompletionRequest, ChatCompletionChunk } from "@/lib/types";
import { API_PATHS } from "@/lib/constants";

interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

export function streamChatCompletion(
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
