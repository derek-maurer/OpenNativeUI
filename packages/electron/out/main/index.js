"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
electron.app.setName("ONI");
function getMimeType(ext) {
  const map = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    pdf: "application/pdf",
    txt: "text/plain",
    md: "text/markdown",
    csv: "text/csv",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  };
  return map[ext.toLowerCase()] ?? "application/octet-stream";
}
let mainWindow = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 12, y: 14 },
    backgroundColor: "#0d0d0d",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  electron.ipcMain.handle("dialog:openFile", async () => {
    if (!mainWindow) return null;
    const result = await electron.dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [
        {
          name: "Supported Files",
          extensions: ["jpg", "jpeg", "png", "gif", "webp", "pdf", "txt", "md", "csv", "docx"]
        },
        { name: "Images", extensions: ["jpg", "jpeg", "png", "gif", "webp"] },
        { name: "Documents", extensions: ["pdf", "txt", "md", "csv", "docx"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
  electron.ipcMain.handle("fs:readFile", async (_event, filePath) => {
    const buffer = await fs.promises.readFile(filePath);
    const ext = path.extname(filePath).slice(1);
    return {
      name: path.basename(filePath),
      buffer: buffer.toString("base64"),
      mimeType: getMimeType(ext)
    };
  });
  electron.ipcMain.handle(
    "theme:getNative",
    () => electron.nativeTheme.shouldUseDarkColors ? "dark" : "light"
  );
  electron.nativeTheme.on("updated", () => {
    mainWindow?.webContents.send(
      "theme:changed",
      electron.nativeTheme.shouldUseDarkColors ? "dark" : "light"
    );
  });
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  if (process.platform === "darwin" && electron.app.dock) {
    const iconPath = path.join(__dirname, "../../build/icon.png");
    electron.app.dock.setIcon(iconPath);
  }
  createWindow();
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
