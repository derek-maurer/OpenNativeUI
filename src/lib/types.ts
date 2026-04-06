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

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  model?: string;
  files?: AttachedFile[];
  info?: MessageInfo;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  model: string;
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
}

// Chat completions
export type ThinkingLevel = "low" | "medium" | "high";

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
  think?: ThinkingLevel | boolean;
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
