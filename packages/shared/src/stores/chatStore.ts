import { create } from "zustand";
import type { Message, AttachedFile, StreamingStatus } from "../lib/types";

interface ChatState {
  currentConversationId: string | null;
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  pendingFiles: AttachedFile[];
  webSearchEnabled: boolean;
  statusHistory: StreamingStatus[];
  pendingFolderId: string | null;

  setConversation: (id: string, messages: Message[]) => void;
  addUserMessage: (message: Message) => void;
  appendStreamToken: (token: string) => void;
  replaceStreamContent: (content: string) => void;
  setStreaming: (value: boolean) => void;
  finalizeStream: (fullMessage: Message) => void;
  clearChat: () => void;
  toggleWebSearch: () => void;
  pushStatusHistory: (status: StreamingStatus) => void;
  setPendingFolderId: (folderId: string | null) => void;
  removeMessagesFrom: (messageId: string) => void;

  addPendingFile: (file: AttachedFile) => void;
  removePendingFile: (fileId: string) => void;
  updateFileStatus: (fileId: string, status: AttachedFile["status"]) => void;
  clearPendingFiles: () => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  currentConversationId: null,
  messages: [],
  streamingContent: "",
  isStreaming: false,
  pendingFiles: [],
  webSearchEnabled: false,
  statusHistory: [],
  pendingFolderId: null,

  setConversation: (id, messages) =>
    set({
      currentConversationId: id,
      messages,
      streamingContent: "",
      isStreaming: false,
      statusHistory: [],
    }),

  addUserMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  appendStreamToken: (token) =>
    set((state) => ({
      streamingContent: state.streamingContent + token,
    })),

  // Used when the streaming layer needs to rewrite the whole assistant
  // message rather than append — e.g. when Open WebUI's socket path sends
  // a full `data.content` payload that already contains a live
  // `<details type="reasoning">` block built server-side, or when the SSE
  // path is growing its own local reasoning block from delta chunks.
  replaceStreamContent: (content) =>
    set(() => ({
      streamingContent: content,
    })),

  setStreaming: (value) =>
    set({
      isStreaming: value,
      streamingContent: "",
      statusHistory: [],
    }),

  finalizeStream: (fullMessage) =>
    set((state) => ({
      messages: [...state.messages, fullMessage],
      streamingContent: "",
      isStreaming: false,
      statusHistory: [],
    })),

  clearChat: () =>
    set({
      currentConversationId: null,
      messages: [],
      streamingContent: "",
      isStreaming: false,
      statusHistory: [],
      pendingFiles: [],
      webSearchEnabled: false,
      pendingFolderId: null,
    }),

  toggleWebSearch: () =>
    set((state) => ({ webSearchEnabled: !state.webSearchEnabled })),

  pushStatusHistory: (status) =>
    set((state) => {
      const action = status.action;
      if (!action) {
        return { statusHistory: [status] };
      }
      const idx = state.statusHistory.findIndex((s) => s.action === action);
      if (idx >= 0) {
        const updated = [...state.statusHistory];
        updated[idx] = status;
        return { statusHistory: updated };
      }
      return { statusHistory: [...state.statusHistory, status] };
    }),

  setPendingFolderId: (folderId) => set({ pendingFolderId: folderId }),

  removeMessagesFrom: (messageId) =>
    set((state) => {
      const idx = state.messages.findIndex((m) => m.id === messageId);
      if (idx < 0) return state;
      return { messages: state.messages.slice(0, idx) };
    }),

  addPendingFile: (file) =>
    set((state) => ({
      pendingFiles: [...state.pendingFiles, file],
    })),

  removePendingFile: (fileId) =>
    set((state) => ({
      pendingFiles: state.pendingFiles.filter((f) => f.id !== fileId),
    })),

  updateFileStatus: (fileId, status) =>
    set((state) => ({
      pendingFiles: state.pendingFiles.map((f) =>
        f.id === fileId ? { ...f, status } : f
      ),
    })),

  clearPendingFiles: () => set({ pendingFiles: [] }),
}));
