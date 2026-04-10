// Storage abstraction — platform packages must register a concrete
// StateStorage impl at startup. Stores resolve the backend lazily, so
// registration order relative to store construction is not load-bearing.
export { registerStorage, lazyStorage, onStorageRegistered } from "./lib/storage";

// SSE factory abstraction — platform packages must register a concrete SSE
// factory at startup before any streaming call is made.
export { registerSSEFactory, type SSEConnection, type SSEFactory } from "./lib/sse";

// Constants
export { API_PATHS, STORAGE_KEYS } from "./lib/constants";

// Thinking-control profiles (per model family, loaded from
// config/thinkingModels.json — edit that file to add a new family).
export {
  getThinkingProfile,
  resolveEffectiveThinkingValue,
  type ThinkingProfile,
  type ThinkingOption,
  type ThinkingValue,
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
  FolderData,
  FolderFileRef,
  AttachedFile,
  OpenWebUIMessage,
  OpenWebUIHistory,
  OpenWebUIChatPayload,
  ServerConversation,
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
  fetchFolderById,
  createFolder,
  updateFolderName,
  updateFolderParent,
  updateFolderExpanded,
  updateFolderData,
  deleteFolder,
  assignChatToFolder,
  fetchChatIdsInFolder,
} from "./services/folderApi";

export { uploadFile } from "./services/fileUpload";

export {
  getSocket,
  getSessionId,
  connectSocket,
  disconnectSocket,
} from "./services/socket";

export * from "./services/streaming";

// Hooks
export { useStreamingChat } from "./hooks/useStreamingChat";
export type { UseStreamingChatOptions } from "./hooks/useStreamingChat";

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
