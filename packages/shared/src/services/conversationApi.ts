import { apiGet, apiPost, apiDelete } from "./api";
import { API_PATHS } from "../lib/constants";
import type {
  Message,
  Conversation,
  ServerConversation,
  OpenWebUIMessage,
  OpenWebUIHistory,
  OpenWebUIChatPayload,
} from "../lib/types";

// --- Server API calls ---

/**
 * Fetch the conversation list. The server returns ChatTitleIdResponse objects
 * (id, title, updated_at, created_at) — not full ServerConversation payloads.
 * toConversation() handles missing fields with safe defaults.
 */
export async function fetchConversations(
  limit = 50,
  skip = 0
): Promise<ServerConversation[]> {
  // include_folders=true is required because by default the server omits
  // foldered chats from this list endpoint, which would make them invisible
  // to the sidebar and to folder detail views.
  return apiGet<ServerConversation[]>(
    `${API_PATHS.CHATS}?limit=${limit}&skip=${skip}&include_folders=true`
  );
}

/**
 * Fetch pinned conversations. Returns the same minimal shape as
 * fetchConversations (ChatTitleIdResponse). The pinned endpoint does not
 * include a `pinned` field or support `include_folders`; callers must
 * set pinned=true themselves and rely on reloadFolderMemberships() for
 * folder assignments.
 */
export async function fetchPinnedConversations(): Promise<ServerConversation[]> {
  return apiGet<ServerConversation[]>(API_PATHS.CHATS_PINNED);
}

export async function fetchConversation(
  id: string
): Promise<ServerConversation> {
  return apiGet<ServerConversation>(API_PATHS.CHAT_BY_ID(id));
}

export async function createServerConversation(
  chat: OpenWebUIChatPayload
): Promise<ServerConversation> {
  const payload = { chat };
  const payloadSize = JSON.stringify(payload).length;
  console.log("[chat:api] POST /chats/new", {
    clientId: chat.id,
    title: chat.title,
    model: chat.models?.[0],
    messageCount: chat.messages?.length,
    historyCount: Object.keys(chat.history?.messages ?? {}).length,
    currentId: chat.history?.currentId,
    payloadBytes: payloadSize,
  });
  try {
    const result = await apiPost<ServerConversation>(API_PATHS.CHATS_NEW, payload);
    console.log("[chat:api] POST /chats/new OK", {
      clientId: chat.id,
      serverId: result?.id,
      returnedTitle: result?.chat?.title,
      returnedMessageCount: result?.chat?.messages?.length,
      idsMatch: result?.id === chat.id,
    });
    return result;
  } catch (e) {
    console.error("[chat:api] POST /chats/new FAILED", {
      clientId: chat.id,
      error: e instanceof Error ? e.message : String(e),
      status: (e as any)?.status,
      body: (e as any)?.body,
    });
    throw e;
  }
}

export async function updateServerConversation(
  id: string,
  chat: Partial<OpenWebUIChatPayload>
): Promise<ServerConversation> {
  const payload = { chat };
  const payloadSize = JSON.stringify(payload).length;
  console.log("[chat:api] POST /chats/:id (update)", {
    id,
    title: chat.title,
    messageCount: chat.messages?.length,
    historyCount: chat.history ? Object.keys(chat.history.messages ?? {}).length : undefined,
    payloadBytes: payloadSize,
  });
  try {
    const result = await apiPost<ServerConversation>(API_PATHS.CHAT_BY_ID(id), payload);
    console.log("[chat:api] POST /chats/:id OK", {
      id,
      serverId: result?.id,
      returnedMessageCount: result?.chat?.messages?.length,
    });
    return result;
  } catch (e) {
    console.error("[chat:api] POST /chats/:id FAILED", {
      id,
      error: e instanceof Error ? e.message : String(e),
      status: (e as any)?.status,
      body: (e as any)?.body,
    });
    throw e;
  }
}

export async function deleteServerConversation(id: string): Promise<void> {
  await apiDelete(API_PATHS.CHAT_BY_ID(id));
}

export async function deleteAllServerConversations(): Promise<void> {
  await apiDelete(API_PATHS.CHATS);
}

export async function pinConversation(
  id: string,
  isPinned: boolean
): Promise<ServerConversation> {
  return apiPost<ServerConversation>(API_PATHS.CHAT_PIN(id), {
    is_pinned: isPinned,
  });
}

export async function archiveConversation(
  id: string
): Promise<ServerConversation> {
  return apiPost<ServerConversation>(API_PATHS.CHAT_ARCHIVE(id), {});
}

export async function shareConversation(
  id: string
): Promise<ServerConversation & { share_id: string }> {
  return apiPost<ServerConversation & { share_id: string }>(
    API_PATHS.CHAT_SHARE(id),
    {}
  );
}

export async function unshareConversation(id: string): Promise<void> {
  await apiDelete(API_PATHS.CHAT_SHARE(id));
}

export async function cloneConversation(
  id: string
): Promise<ServerConversation> {
  return apiPost<ServerConversation>(API_PATHS.CHAT_CLONE(id), {});
}

// --- Format conversion helpers ---

/**
 * Convert an Open WebUI history tree to a flat ordered message array.
 * Walks the chain from root to currentId.
 */
export function historyToMessages(
  history: OpenWebUIHistory,
  conversationId: string
): Message[] {
  if (!history.currentId || Object.keys(history.messages).length === 0) {
    return [];
  }

  // Find root (message with no parent)
  let rootId: string | null = null;
  for (const [id, msg] of Object.entries(history.messages)) {
    if (!msg.parentId) {
      rootId = id;
      break;
    }
  }

  if (!rootId) return [];

  // Walk from root following children toward currentId
  const result: Message[] = [];
  let currentId: string | null = rootId;

  while (currentId) {
    const msg: OpenWebUIMessage | undefined = history.messages[currentId];
    if (!msg) break;

    result.push({
      id: msg.id,
      conversationId,
      role: msg.role,
      content: msg.content,
      createdAt: msg.timestamp * 1000, // Convert back to ms
      model: msg.model,
      files: msg.files,
      sources: msg.sources,
    });

    // Follow children — pick the last child (most recent branch) if multiple
    if (msg.childrenIds.length > 0) {
      currentId = msg.childrenIds[msg.childrenIds.length - 1];
    } else {
      currentId = null;
    }
  }

  return result;
}

/**
 * Build a full chat payload from messages and metadata in the exact shape
 * OpenWebUI's backend expects. This mirrors Conduit's `createConversation`
 * helper: `history.messages` is a parent-child map, and `chat.messages` is
 * a parallel array of full message objects (NOT just IDs) so the WebUI and
 * our own loader can render the conversation.
 */
export function buildChatPayload(
  conversationId: string,
  title: string,
  model: string,
  messages: Message[]
): OpenWebUIChatPayload {
  const messagesMap: Record<string, OpenWebUIMessage> = {};
  const messagesArray: OpenWebUIMessage[] = [];
  let previousId: string | null = null;
  let lastUserId: string | null = null;
  let currentId: string | null = null;

  for (const msg of messages) {
    // Assistant messages branch from the last user message (OpenWebUI-style);
    // user/system messages chain linearly from the previous message.
    const parentId =
      msg.role === "assistant" ? (lastUserId ?? previousId) : previousId;

    const entry: OpenWebUIMessage = {
      id: msg.id,
      parentId,
      childrenIds: [],
      role: msg.role,
      content: msg.content,
      timestamp: Math.floor(msg.createdAt / 1000),
      ...(msg.files && msg.files.length > 0 && { files: msg.files }),
      ...(msg.sources && msg.sources.length > 0 && { sources: msg.sources }),
      ...(msg.role === "user" && { models: [model] }),
      ...(msg.role === "assistant" &&
        msg.model && {
          model: msg.model,
          modelName: msg.model,
          modelIdx: 0,
          done: true,
        }),
    };

    messagesMap[msg.id] = entry;
    // Link child back into parent
    if (parentId && messagesMap[parentId]) {
      messagesMap[parentId].childrenIds.push(msg.id);
    }
    messagesArray.push(entry);

    previousId = msg.id;
    currentId = msg.id;
    if (msg.role === "user") {
      lastUserId = msg.id;
    }
  }

  return {
    id: conversationId,
    title,
    models: [model],
    params: {},
    history: {
      messages: messagesMap,
      currentId,
    },
    messages: messagesArray,
    tags: [],
    timestamp: Date.now() / 1000,
  };
}

/**
 * Convert a ServerConversation to the lightweight Conversation type used in the sidebar.
 */
export function toConversation(sc: ServerConversation): Conversation {
  return {
    id: sc.id,
    title: sc.chat?.title ?? sc.title ?? "Untitled",
    model: sc.chat?.models?.[0] ?? "unknown",
    createdAt: sc.created_at * 1000,
    updatedAt: sc.updated_at * 1000,
    folderId: sc.folder_id ?? null,
    pinned: sc.pinned ?? false,
    archived: sc.archived ?? false,
    shareId: sc.share_id ?? null,
  };
}
