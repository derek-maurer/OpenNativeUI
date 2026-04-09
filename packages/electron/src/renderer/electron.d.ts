interface Window {
  electronAPI: {
    openFileDialog(): Promise<string | null>;
    readFile(filePath: string): Promise<{
      name: string;
      buffer: string; // base64
      mimeType: string;
    }>;
    getNativeTheme(): Promise<"light" | "dark">;
    onThemeChanged(callback: (theme: "light" | "dark") => void): void;
    removeThemeListener(): void;
    openExternal(url: string): void;

    // App storage (file-backed)
    storageGetItem(key: string): Promise<string | null>;
    storageSetItem(key: string, value: string): Promise<void>;
    storageRemoveItem(key: string): Promise<void>;

    // Chat bar
    getChatBarHotkey(): Promise<string>;
    setChatBarHotkey(hotkey: string): Promise<{ success: boolean; error?: string }>;
    hideChatBar(): void;
    setChatBarHeight(height: number): void;
    submitFromChatBar(query: string, modelId: string): void;
    onChatBarSubmit(callback: (payload: { query: string; modelId: string }) => void): void;
    removeChatBarSubmitListener(): void;
    onChatBarWillHide(callback: () => void): void;
    removeChatBarWillHideListener(): void;
    onChatBarRehydrate(callback: () => void): void;
    removeChatBarRehydrateListener(): void;
  };
}
