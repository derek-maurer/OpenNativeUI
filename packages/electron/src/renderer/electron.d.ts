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
  };
}
