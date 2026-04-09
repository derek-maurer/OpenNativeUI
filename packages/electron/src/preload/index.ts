import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  openFileDialog: (): Promise<string | null> =>
    ipcRenderer.invoke("dialog:openFile"),

  readFile: (
    filePath: string
  ): Promise<{ name: string; buffer: string; mimeType: string }> =>
    ipcRenderer.invoke("fs:readFile", filePath),

  getNativeTheme: (): Promise<"light" | "dark"> =>
    ipcRenderer.invoke("theme:getNative"),

  onThemeChanged: (callback: (theme: "light" | "dark") => void): void => {
    ipcRenderer.on("theme:changed", (_event, theme) => callback(theme));
  },

  removeThemeListener: (): void => {
    ipcRenderer.removeAllListeners("theme:changed");
  },

  openExternal: (url: string): void => {
    ipcRenderer.send("shell:openExternal", url);
  },

  // ── App storage (file-backed via main process) ───────────────────────────

  storageGetItem: (key: string): Promise<string | null> =>
    ipcRenderer.invoke("storage:getItem", key),

  storageSetItem: (key: string, value: string): Promise<void> =>
    ipcRenderer.invoke("storage:setItem", key, value),

  storageRemoveItem: (key: string): Promise<void> =>
    ipcRenderer.invoke("storage:removeItem", key),

  // ── Chat bar ──────────────────────────────────────────────────────────────

  getChatBarHotkey: (): Promise<string> =>
    ipcRenderer.invoke("chatbar:getHotkey"),

  setChatBarHotkey: (hotkey: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("chatbar:setHotkey", hotkey),

  hideChatBar: (): void => {
    ipcRenderer.send("chatbar:hide");
  },

  setChatBarHeight: (height: number): void => {
    ipcRenderer.send("chatbar:setHeight", height);
  },

  submitFromChatBar: (query: string, modelId: string): void => {
    ipcRenderer.send("chatbar:submit", { query, modelId });
  },

  onChatBarSubmit: (callback: (payload: { query: string; modelId: string }) => void): void => {
    ipcRenderer.on("chatbar:incoming", (_event, payload) => callback(payload));
  },

  removeChatBarSubmitListener: (): void => {
    ipcRenderer.removeAllListeners("chatbar:incoming");
  },

  onChatBarWillHide: (callback: () => void): void => {
    ipcRenderer.on("chatbar:willHide", () => callback());
  },

  removeChatBarWillHideListener: (): void => {
    ipcRenderer.removeAllListeners("chatbar:willHide");
  },

  onChatBarRehydrate: (callback: () => void): void => {
    ipcRenderer.on("chatbar:rehydrate", () => callback());
  },

  removeChatBarRehydrateListener: (): void => {
    ipcRenderer.removeAllListeners("chatbar:rehydrate");
  },
});
