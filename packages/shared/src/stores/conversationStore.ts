import { create } from "zustand";
import type { Conversation } from "../lib/types";
import {
  fetchConversations,
  fetchPinnedConversations,
  deleteServerConversation,
  deleteAllServerConversations,
  updateServerConversation,
  pinConversation as pinConversationApi,
  archiveConversation as archiveConversationApi,
  shareConversation as shareConversationApi,
  unshareConversation as unshareConversationApi,
  cloneConversation as cloneConversationApi,
  toConversation,
} from "../services/conversationApi";
import { assignChatToFolder, fetchChatIdsInFolder } from "../services/folderApi";
import { useFolderStore } from "./folderStore";

interface ConversationState {
  conversations: Conversation[];
  isLoading: boolean;
  loadConversations: () => Promise<void>;
  addConversation: (conv: Conversation) => void;
  removeConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  moveConversationToFolder: (
    id: string,
    folderId: string | null
  ) => Promise<void>;
  pinConversation: (id: string, isPinned: boolean) => Promise<void>;
  archiveConversation: (id: string) => Promise<void>;
  shareConversation: (id: string) => Promise<string>;
  unshareConversation: (id: string) => Promise<void>;
  cloneConversation: (id: string) => Promise<Conversation>;
  reloadFolderMemberships: () => Promise<void>;
  updateConversationLocally: (id: string, updates: Partial<Conversation>) => void;
  clearAll: () => Promise<void>;
}

export const useConversationStore = create<ConversationState>()((set) => ({
  conversations: [],
  isLoading: false,

  loadConversations: async () => {
    set({ isLoading: true });
    try {
      const [serverConversations, serverPinned] = await Promise.all([
        fetchConversations(50, 0),
        fetchPinnedConversations(),
      ]);
      const unpinned = serverConversations.map(toConversation);
      // The pinned endpoint returns minimal ChatTitleIdResponse objects
      // without a `pinned` field, so we set it explicitly. Folder
      // assignments are resolved separately by reloadFolderMemberships().
      const pinned = serverPinned.map((sc) => ({
        ...toConversation(sc),
        pinned: true,
      }));
      // Merge pinned + unpinned, deduplicating by id (pinned wins)
      const seen = new Set(pinned.map((c) => c.id));
      const conversations = [
        ...pinned,
        ...unpinned.filter((c) => !seen.has(c.id)),
      ];
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

  moveConversationToFolder: async (id, folderId) => {
    await assignChatToFolder(id, folderId);
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, folderId, updatedAt: Date.now() } : c
      ),
    }));
  },

  pinConversation: async (id, isPinned) => {
    // The server endpoint is a toggle (ignores the body), so use the
    // response's actual pinned state rather than the requested value
    // to stay in sync if local state was stale.
    const result = await pinConversationApi(id, isPinned);
    const pinned = result.pinned ?? isPinned;
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, pinned, updatedAt: Date.now() } : c
      ),
    }));
  },

  archiveConversation: async (id) => {
    await archiveConversationApi(id);
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
    }));
  },

  shareConversation: async (id) => {
    const result = await shareConversationApi(id);
    // The API returns the shared copy — its `id` is the share identifier
    // used in /s/{share_id} URLs. The original chat's share_id field
    // points to this same value.
    const shareId = result.id;
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, shareId, updatedAt: Date.now() } : c
      ),
    }));
    return shareId;
  },

  unshareConversation: async (id) => {
    await unshareConversationApi(id);
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, shareId: null, updatedAt: Date.now() } : c
      ),
    }));
  },

  cloneConversation: async (id) => {
    const result = await cloneConversationApi(id);
    const cloned = toConversation(result);
    set((state) => ({
      conversations: [cloned, ...state.conversations],
    }));
    return cloned;
  },

  reloadFolderMemberships: async () => {
    const folders = useFolderStore.getState().folders;
    if (folders.length === 0) {
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.folderId ? { ...c, folderId: null } : c
        ),
      }));
      return;
    }

    const results = await Promise.all(
      folders.map(async (folder) => {
        try {
          const chatIds = await fetchChatIdsInFolder(folder.id);
          return { folderId: folder.id, chatIds };
        } catch (e) {
          console.error("[folder:memberships] fetch failed", {
            folderId: folder.id,
            error: e instanceof Error ? e.message : String(e),
          });
          return { folderId: folder.id, chatIds: [] as string[] };
        }
      })
    );

    const membership = new Map<string, string>();
    for (const { folderId, chatIds } of results) {
      for (const chatId of chatIds) {
        membership.set(chatId, folderId);
      }
    }

    set((state) => ({
      conversations: state.conversations.map((c) => ({
        ...c,
        folderId: membership.get(c.id) ?? null,
      })),
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
