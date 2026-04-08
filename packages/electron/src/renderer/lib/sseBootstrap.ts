/**
 * Side-effect module: registers a fetch-based SSE factory for the Electron
 * renderer. Unlike native EventSource, this implementation can POST with
 * custom headers — required for Open WebUI's chat completions endpoint.
 *
 * Must be imported before any streaming call in main.tsx.
 */
import { registerSSEFactory, type SSEConnection } from "@opennative/shared";

registerSSEFactory((url, { headers, body }): SSEConnection => {
  const controller = new AbortController();
  const listeners = new Map<string, Array<(e: any) => void>>();
  let closed = false;

  (async () => {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { ...headers, Accept: "text/event-stream" },
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        const handlers = listeners.get("error") ?? [];
        handlers.forEach((h) => h({ message: `HTTP ${response.status}` }));
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!closed) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            const handlers = listeners.get("message") ?? [];
            handlers.forEach((h) => h({ data }));
          }
        }
      }
    } catch (e: any) {
      if (!closed && e?.name !== "AbortError") {
        const handlers = listeners.get("error") ?? [];
        handlers.forEach((h) => h({ message: e?.message ?? "Stream error" }));
      }
    }
  })();

  return {
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type)!.push(handler);
    },
    removeAllEventListeners() {
      listeners.clear();
    },
    close() {
      closed = true;
      controller.abort();
    },
  };
});
