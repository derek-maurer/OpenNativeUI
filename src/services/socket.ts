import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function getSessionId(): string | undefined {
  return socket?.id;
}

export function connectSocket(): void {
  const { serverUrl, token } = useAuthStore.getState();
  if (!serverUrl || !token) return;
  if (socket?.connected) return;

  if (socket) {
    socket.disconnect();
  }

  socket = io(serverUrl, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity,
  });

  socket.on("connect", () => {
    console.log("[Socket] Connected, sid:", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket] Disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.warn("[Socket] Connection error:", error.message);
  });
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
