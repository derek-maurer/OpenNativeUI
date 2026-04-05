export const API_PATHS = {
  // Auth
  SIGNIN: "/api/v1/auths/signin",
  AUTH_VERIFY: "/api/v1/auths/",

  // Models
  MODELS: "/api/models",

  // Chat
  CHAT_COMPLETIONS: "/api/chat/completions",

  // Conversations
  CHATS: "/api/v1/chats/",
  CHATS_NEW: "/api/v1/chats/new",
  CHAT_BY_ID: (id: string) => `/api/v1/chats/${id}`,

  // Files
  FILES_UPLOAD: "/api/v1/files/",
  FILE_STATUS: (id: string) => `/api/v1/files/${id}/process/status`,
  KNOWLEDGE_ADD_FILE: (id: string) => `/api/v1/knowledge/${id}/file/add`,
} as const;

export const STORAGE_KEYS = {
  AUTH: "auth-storage",
  SETTINGS: "settings-storage",
  MODELS: "models-storage",
} as const;
