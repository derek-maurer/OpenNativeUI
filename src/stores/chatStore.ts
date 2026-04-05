import { create } from "zustand";
import type { Message, AttachedFile } from "@/lib/types";

interface ChatState {
  currentConversationId: string | null;
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  pendingFiles: AttachedFile[];
  webSearchEnabled: boolean;

  setConversation: (id: string, messages: Message[]) => void;
  addUserMessage: (message: Message) => void;
  appendStreamToken: (token: string) => void;
  setStreaming: (value: boolean) => void;
  finalizeStream: (fullMessage: Message) => void;
  clearChat: () => void;
  toggleWebSearch: () => void;

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

  setConversation: (id, messages) =>
    set({
      currentConversationId: id,
      messages,
      streamingContent: "",
      isStreaming: false,
    }),

  addUserMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  appendStreamToken: (token) =>
    set((state) => ({
      streamingContent: state.streamingContent + token,
    })),

  setStreaming: (value) =>
    set({
      isStreaming: value,
      streamingContent: value ? "" : "",
    }),

  finalizeStream: (fullMessage) =>
    set((state) => ({
      messages: [...state.messages, fullMessage],
      streamingContent: "",
      isStreaming: false,
    })),

  clearChat: () =>
    set({
      currentConversationId: null,
      messages: [],
      streamingContent: "",
      isStreaming: false,
      pendingFiles: [],
      webSearchEnabled: false,
    }),

  toggleWebSearch: () =>
    set((state) => ({ webSearchEnabled: !state.webSearchEnabled })),

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
