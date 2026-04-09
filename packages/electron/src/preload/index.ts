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
});
