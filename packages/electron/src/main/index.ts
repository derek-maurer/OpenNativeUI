import { app, BrowserWindow, ipcMain, dialog, nativeTheme } from "electron";
import path from "path";
import fs from "fs";

app.setName("ONI");

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    pdf: "application/pdf",
    txt: "text/plain",
    md: "text/markdown",
    csv: "text/csv",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return map[ext.toLowerCase()] ?? "application/octet-stream";
}

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
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
      sandbox: true,
    },
  });

  // IPC: open file dialog
  ipcMain.handle("dialog:openFile", async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [
        {
          name: "Supported Files",
          extensions: ["jpg", "jpeg", "png", "gif", "webp", "pdf", "txt", "md", "csv", "docx"],
        },
        { name: "Images", extensions: ["jpg", "jpeg", "png", "gif", "webp"] },
        { name: "Documents", extensions: ["pdf", "txt", "md", "csv", "docx"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // IPC: read file as base64
  ipcMain.handle("fs:readFile", async (_event, filePath: string) => {
    const buffer = await fs.promises.readFile(filePath);
    const ext = path.extname(filePath).slice(1);
    return {
      name: path.basename(filePath),
      buffer: buffer.toString("base64"),
      mimeType: getMimeType(ext),
    };
  });

  // IPC: get native theme
  ipcMain.handle("theme:getNative", () =>
    nativeTheme.shouldUseDarkColors ? "dark" : "light"
  );

  // Push theme changes to renderer
  nativeTheme.on("updated", () => {
    mainWindow?.webContents.send(
      "theme:changed",
      nativeTheme.shouldUseDarkColors ? "dark" : "light"
    );
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Load app
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  // Set dock icon (macOS dev mode — production builds use electron-builder)
  if (process.platform === "darwin" && app.dock) {
    const iconPath = path.join(__dirname, "../../build/icon.png");
    app.dock.setIcon(iconPath);
  }
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
