/**
 * Platform-agnostic SSE factory abstraction.
 *
 * Each platform package must register a factory at startup (before any
 * streaming call) via registerSSEFactory(). This mirrors the registerStorage()
 * pattern so the shared streaming service stays free of platform-specific deps.
 *
 * - Mobile (React Native): registers a wrapper around react-native-sse
 * - Electron (renderer): registers a fetch+ReadableStream implementation
 */

export interface SSEConnection {
  addEventListener(type: "message" | "error", handler: (e: any) => void): void;
  removeAllEventListeners(): void;
  close(): void;
}

export type SSEFactory = (
  url: string,
  options: { headers: Record<string, string>; body: string }
) => SSEConnection;

let _factory: SSEFactory | null = null;
const _listeners: Array<(factory: SSEFactory) => void> = [];

export function registerSSEFactory(factory: SSEFactory): void {
  _factory = factory;
  for (const cb of _listeners) {
    cb(factory);
  }
  _listeners.length = 0;
}

export function createSSEConnection(
  url: string,
  options: { headers: Record<string, string>; body: string }
): SSEConnection {
  if (!_factory) {
    throw new Error(
      "[shared/sse] No SSE factory registered. Call registerSSEFactory() at platform bootstrap."
    );
  }
  return _factory(url, options);
}
