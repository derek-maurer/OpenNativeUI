export const API_PATHS = {
  // Auth
  SIGNIN: "/api/v1/auths/signin",
  AUTH_VERIFY: "/api/v1/auths/",

  // Config
  CONFIG: "/api/config",

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
  FILE_PROCESS_STATUS: (id: string) => `/api/v1/files/${id}/process/status`,
  KNOWLEDGE_ADD_FILE: (id: string) => `/api/v1/knowledge/${id}/file/add`,

  // Folders
  FOLDERS: "/api/v1/folders/",
  FOLDER_BY_ID: (id: string) => `/api/v1/folders/${id}`,
  FOLDER_UPDATE: (id: string) => `/api/v1/folders/${id}/update`,
  FOLDER_UPDATE_PARENT: (id: string) => `/api/v1/folders/${id}/update/parent`,
  FOLDER_UPDATE_EXPANDED: (id: string) => `/api/v1/folders/${id}/update/expanded`,
  CHAT_FOLDER: (id: string) => `/api/v1/chats/${id}/folder`,
  CHATS_IN_FOLDER: (folderId: string) =>
    `/api/v1/chats/folder/${folderId}`,
} as const;

export const STORAGE_KEYS = {
  AUTH: "auth-storage",
  SETTINGS: "settings-storage",
  MODELS: "models-storage",
  MODEL_PREFERENCES: "model-preferences-storage",
} as const;
