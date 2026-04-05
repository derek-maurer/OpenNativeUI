import { apiGet, apiPost, apiDelete } from "@/services/api";
import { API_PATHS } from "@/lib/constants";
import type {
  Message,
  Conversation,
  ServerConversation,
  OpenWebUIMessage,
  OpenWebUIHistory,
  OpenWebUIChatPayload,
} from "@/lib/types";

// --- Server API calls ---

export async function fetchConversations(
  limit = 50,
  skip = 0
): Promise<ServerConversation[]> {
  return apiGet<ServerConversation[]>(
    `${API_PATHS.CHATS}?limit=${limit}&skip=${skip}`
  );
}

export async function fetchConversation(
  id: string
): Promise<ServerConversation> {
  return apiGet<ServerConversation>(API_PATHS.CHAT_BY_ID(id));
}

export async function createServerConversation(
  chat: OpenWebUIChatPayload
): Promise<ServerConversation> {
  return apiPost<ServerConversation>(API_PATHS.CHATS_NEW, { chat });
}

export async function updateServerConversation(
  id: string,
  chat: Partial<OpenWebUIChatPayload>
): Promise<ServerConversation> {
  return apiPost<ServerConversation>(API_PATHS.CHAT_BY_ID(id), { chat });
}

export async function deleteServerConversation(id: string): Promise<void> {
  await apiDelete(API_PATHS.CHAT_BY_ID(id));
}

export async function deleteAllServerConversations(): Promise<void> {
  await apiDelete(API_PATHS.CHATS);
}

// --- Format conversion helpers ---

/**
 * Convert a flat ordered message array to the Open WebUI history tree format.
 * Since our app doesn't support branching, the tree is always a linear chain.
 */
export function messagesToHistory(messages: Message[]): OpenWebUIHistory {
  if (messages.length === 0) {
    return { messages: {}, currentId: null };
  }

  const historyMessages: OpenWebUIHistory["messages"] = {};

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const parentId = i > 0 ? messages[i - 1].id : null;
    const childrenIds = i < messages.length - 1 ? [messages[i + 1].id] : [];

    historyMessages[msg.id] = {
      id: msg.id,
      parentId,
      childrenIds,
      role: msg.role,
      content: msg.content,
      timestamp: msg.createdAt / 1000, // Open WebUI uses seconds
      model: msg.model,
      files: msg.files,
    };
  }

  return {
    messages: historyMessages,
    currentId: messages[messages.length - 1].id,
  };
}

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
 * Build a full chat payload from messages and metadata.
 */
export function buildChatPayload(
  conversationId: string,
  title: string,
  model: string,
  messages: Message[]
): OpenWebUIChatPayload {
  const history = messagesToHistory(messages);

  return {
    id: conversationId,
    title,
    models: [model],
    params: {},
    history,
    messages: messages.map((m) => m.id),
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
  };
}
