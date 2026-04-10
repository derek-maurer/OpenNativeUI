export interface ServerConfig {
  url: string;
  token: string;
}

// Auth
export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  token: string;
  token_type: string;
  id: string;
  email: string;
  name: string;
  role: string;
  profile_image_url: string;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: string;
  profile_image_url: string;
}

// Server config
export interface OpenWebUIConfig {
  features?: {
    enable_web_search?: boolean;
    [key: string]: unknown;
  };
  permissions?: {
    features?: {
      web_search?: boolean;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

// Models
export interface Model {
  id: string;
  name: string;
  owned_by: string;
  object: string;
  created: number;
}

export interface ModelsResponse {
  data: Model[];
}

// Messages & Conversations
export interface MessageInfo {
  model: string;
  totalDuration: number; // seconds from first token to last
  outputTokens: number; // approximate output token count (word-based estimate)
  tokensPerSecond: number;
}

/**
 * Per-document metadata inside a {@link MessageSource} bundle. Each entry
 * here corresponds 1:1 to an entry in the parent bundle's `document` array.
 *
 * Note: the field named `source` is the *URL string* of that document
 * (Open WebUI's naming, not ours). Don't confuse it with the outer
 * {@link MessageSource.source} which describes the search/RAG bundle.
 */
export interface MessageSourceMetadata {
  source?: string; // URL
  title?: string;
  description?: string;
  language?: string;
  start_index?: number;
  [key: string]: unknown;
}

/**
 * One source bundle attached to an assistant message. Emitted by Open
 * WebUI as its own frame in the chat completion stream. A single bundle
 * typically represents one search query or one knowledge-base lookup that
 * returned multiple documents — the `document`/`metadata` arrays are
 * parallel, indexed by document.
 *
 * Citation tokens like `[N]` in the assistant content are 1-indexed into
 * the **flat concatenation** of `metadata[]` across all bundles attached
 * to the message — see `flattenCitations()` in MessageBubble.
 */
export interface MessageSource {
  source?: {
    name?: string;
    type?: string; // e.g. "web_search"
    urls?: string[];
    queries?: string[];
    collection_name?: string;
  };
  document?: string[];
  metadata?: MessageSourceMetadata[];
  distances?: number[];
  [key: string]: unknown;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  model?: string;
  files?: AttachedFile[];
  info?: MessageInfo;
  sources?: MessageSource[];
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  model: string;
  folderId?: string | null;
}

export interface FolderFileRef {
  /** "file" for an uploaded file, "collection" for a knowledge collection. */
  type: "file" | "collection";
  id: string;
  name?: string;
}

export interface FolderData {
  system_prompt?: string;
  files?: FolderFileRef[];
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  is_expanded: boolean;
  /**
   * Folder data blob (system prompt + attached files/collections).
   * Only populated by GET /folders/{id}; the list endpoint omits it.
   */
  data?: FolderData | null;
  created_at: number; // seconds
  updated_at: number; // seconds
}

export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  status: "uploading" | "processing" | "ready" | "error";
  uri?: string;
  mimeType?: string;
  dataUrl?: string;
}

// Open WebUI conversation format
export interface OpenWebUIMessage {
  id: string;
  parentId: string | null;
  childrenIds: string[];
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  files?: AttachedFile[];
  // User-message fields
  models?: string[];
  // Assistant-message fields
  model?: string;
  modelName?: string;
  modelIdx?: number;
  done?: boolean;
  sources?: MessageSource[];
}

export interface OpenWebUIHistory {
  messages: Record<string, OpenWebUIMessage>;
  currentId: string | null;
}

export interface OpenWebUIChatPayload {
  id: string;
  title: string;
  models: string[];
  params: Record<string, unknown>;
  history: OpenWebUIHistory;
  messages: OpenWebUIMessage[];
  tags: string[];
  timestamp: number;
}

export interface ServerConversation {
  id: string;
  title: string;
  chat: OpenWebUIChatPayload;
  updated_at: number;
  created_at: number;
  share_id?: string | null;
  folder_id?: string | null;
}

// Chat completions
export type MessageContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface ChatCompletionRequest {
  model: string;
  messages: Array<{ role: string; content: string | MessageContentPart[] }>;
  stream: boolean;
  files?: Array<{ type: string; id: string }>;
  chat_id?: string;
  id?: string;
  features?: {
    web_search?: boolean;
  };
  /**
   * Forwarded to Open WebUI's `apply_params_to_form_data` middleware.
   * Keys land on different upstream fields depending on the model owner —
   * `think` is promoted to the Ollama payload root, `reasoning_effort`
   * passes through to OpenAI/Azure top-level. See `getThinkingProfile`
   * and `open-webui/backend/open_webui/utils/payload.py`.
   */
  params?: Record<string, unknown>;
}

export interface StreamingStatus {
  action?: string;
  description: string;
  done: boolean;
}

export interface ChatCompletionChunk {
  id: string;
  choices: Array<{
    delta: { content?: string; role?: string };
    finish_reason: string | null;
    index: number;
  }>;
  model: string;
}
