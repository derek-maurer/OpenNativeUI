/**
 * Side-effect module: registers react-native-sse as the SSE backend for
 * @opennative/shared's streaming service.
 *
 * Must be imported before any streaming call is made. Import alongside
 * storageBootstrap at the top of the root layout.
 */
import RNEventSource from "react-native-sse";
import { registerSSEFactory } from "@opennative/shared";

registerSSEFactory((url, { headers, body }) => {
  const es = new RNEventSource(url, {
    headers,
    method: "POST",
    body,
    pollingInterval: 0,
  });

  return {
    addEventListener: (type: "message" | "error", handler: (e: any) => void) => {
      es.addEventListener(type, handler);
    },
    removeAllEventListeners: () => {
      es.removeAllEventListeners();
    },
    close: () => {
      es.close();
    },
  };
});
