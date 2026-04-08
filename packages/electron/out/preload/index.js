"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  openFileDialog: () => electron.ipcRenderer.invoke("dialog:openFile"),
  readFile: (filePath) => electron.ipcRenderer.invoke("fs:readFile", filePath),
  getNativeTheme: () => electron.ipcRenderer.invoke("theme:getNative"),
  onThemeChanged: (callback) => {
    electron.ipcRenderer.on("theme:changed", (_event, theme) => callback(theme));
  },
  removeThemeListener: () => {
    electron.ipcRenderer.removeAllListeners("theme:changed");
  }
});
