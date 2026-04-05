import { create } from "zustand";
import type { Conversation } from "@/lib/types";
import {
  fetchConversations,
  deleteServerConversation,
  deleteAllServerConversations,
  updateServerConversation,
  toConversation,
} from "@/services/conversationApi";

interface ConversationState {
  conversations: Conversation[];
  isLoading: boolean;
  loadConversations: () => Promise<void>;
  addConversation: (conv: Conversation) => void;
  removeConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  updateConversationLocally: (id: string, updates: Partial<Conversation>) => void;
  clearAll: () => Promise<void>;
}

export const useConversationStore = create<ConversationState>()((set) => ({
  conversations: [],
  isLoading: false,

  loadConversations: async () => {
    set({ isLoading: true });
    try {
      const serverConversations = await fetchConversations(50, 0);
      const conversations = serverConversations.map(toConversation);
      set({ conversations, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addConversation: (conv) => {
    set((state) => ({
      conversations: [conv, ...state.conversations],
    }));
  },

  removeConversation: async (id) => {
    await deleteServerConversation(id);
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
    }));
  },

  renameConversation: async (id, title) => {
    await updateServerConversation(id, { title });
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, title, updatedAt: Date.now() } : c
      ),
    }));
  },

  updateConversationLocally: (id, updates) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
  },

  clearAll: async () => {
    await deleteAllServerConversations();
    set({ conversations: [] });
  },
}));
