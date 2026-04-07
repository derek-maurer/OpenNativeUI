// Storage abstraction — platform packages must register a concrete
// StateStorage impl before any persisted store is accessed.
export { registerStorage, getStorage } from "./lib/storage";

// Constants
export { API_PATHS, STORAGE_KEYS } from "./lib/constants";

// Model capabilities
export {
  getModelCapabilities,
  type ModelCapabilities,
  type ThinkingCapability,
} from "./lib/modelCapabilities";

// Reasoning / thinking content parsing
export {
  parseReasoningSegments,
  hasReasoningContent,
  cleanReasoningText,
  formatDuration,
  type ReasoningEntry,
  type ReasoningSegment,
  type BlockType,
} from "./lib/reasoningParser";

// Types
export type {
  ServerConfig,
  SignInRequest,
  SignInResponse,
  UserInfo,
  Model,
  ModelsResponse,
  MessageInfo,
  MessageSourceMetadata,
  MessageSource,
  Message,
  Conversation,
  Folder,
  AttachedFile,
  OpenWebUIMessage,
  OpenWebUIHistory,
  OpenWebUIChatPayload,
  ServerConversation,
  ThinkingLevel,
  MessageContentPart,
  ChatCompletionRequest,
  StreamingStatus,
  ChatCompletionChunk,
} from "./lib/types";

// Services
export {
  apiGet,
  apiPost,
  apiDelete,
  signIn,
  validateToken,
  validateConnection,
  ApiError,
} from "./services/api";

export {
  fetchConversations,
  fetchConversation,
  createServerConversation,
  updateServerConversation,
  deleteServerConversation,
  deleteAllServerConversations,
  historyToMessages,
  buildChatPayload,
  toConversation,
} from "./services/conversationApi";

export {
  fetchFolders,
  createFolder,
  updateFolderName,
  updateFolderParent,
  updateFolderExpanded,
  deleteFolder,
  assignChatToFolder,
  fetchChatIdsInFolder,
} from "./services/folderApi";

export { uploadFile, checkFileStatus, pollUntilReady } from "./services/fileUpload";

export {
  getSocket,
  getSessionId,
  connectSocket,
  disconnectSocket,
} from "./services/socket";

export * from "./services/streaming";

// Stores
export { useAuthStore } from "./stores/authStore";
export { useChatStore } from "./stores/chatStore";
export { useConversationStore } from "./stores/conversationStore";
export { useFolderStore } from "./stores/folderStore";
export {
  useModelPreferencesStore,
  getThinkingForModel,
} from "./stores/modelPreferencesStore";
export { useModelStore } from "./stores/modelStore";
export { useSettingsStore } from "./stores/settingsStore";
