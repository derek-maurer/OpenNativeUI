import { app, BrowserWindow, dialog, globalShortcut, ipcMain, nativeTheme, screen, session, shell } from "electron";
import fs from "fs";
import path from "path";

app.setName("ONI");

// ── Chat bar config (persisted in userData) ──────────────────────────────────

const configPath = () => path.join(app.getPath("userData"), "chatbar-config.json");

function loadChatBarConfig(): { hotkey: string } {
  try {
    const data = fs.readFileSync(configPath(), "utf-8");
    return { hotkey: "Alt+Space", ...JSON.parse(data) };
  } catch {
    return { hotkey: "Alt+Space" };
  }
}

function saveChatBarConfig(config: { hotkey: string }): void {
  try {
    fs.writeFileSync(configPath(), JSON.stringify(config), "utf-8");
  } catch {
    // ignore — non-critical
  }
}

// ── App storage (file-backed, IPC-exposed) ────────────────────────────────────
// Replaces localStorage so data survives Ctrl+C kills in dev mode and
// is immediately consistent across the main window and chat bar window.

const appStoragePath = () => path.join(app.getPath("userData"), "app-storage.json");
let appStorageData: Record<string, string> = {};

function loadAppStorage(): void {
  try {
    const raw = fs.readFileSync(appStoragePath(), "utf-8");
    appStorageData = JSON.parse(raw);
  } catch {
    appStorageData = {};
  }
}

function saveAppStorage(): void {
  try {
    fs.writeFileSync(appStoragePath(), JSON.stringify(appStorageData), "utf-8");
  } catch {
    // non-critical
  }
}

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
let chatBarWindow: BrowserWindow | null = null;
let currentHotkey = "Alt+Space";
let isQuitting = false;

// ── Chat bar window ──────────────────────────────────────────────────────────

function createChatBarWindow(): void {
  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 680,
    height: 72,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  };

  if (process.platform === "darwin") {
    windowOptions.vibrancy = "hud";
    windowOptions.visualEffectState = "active";
  }

  chatBarWindow = new BrowserWindow(windowOptions);

  // Hide on blur (clicking outside)
  chatBarWindow.on("blur", () => {
    if (!chatBarWindow) return;
    chatBarWindow.webContents.send("chatbar:willHide");
    chatBarWindow.hide();
    // Reset to input-bar height
    chatBarWindow.setSize(680, 72);
  });

  // Intercept close to hide instead of destroy
  chatBarWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      chatBarWindow?.hide();
      chatBarWindow?.setSize(680, 72);
    }
  });

  if (process.env.NODE_ENV === "development") {
    chatBarWindow.loadURL("http://localhost:5173/#/chatbar");
  } else {
    chatBarWindow.loadFile(path.join(__dirname, "../renderer/index.html"), {
      hash: "/chatbar",
    });
  }
}

function toggleChatBar(): void {
  if (!chatBarWindow) return;

  if (chatBarWindow.isVisible()) {
    chatBarWindow.webContents.send("chatbar:willHide");
    chatBarWindow.hide();
    chatBarWindow.setSize(680, 72);
    return;
  }

  // Center horizontally, position ~30% down on the active screen
  const point = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(point);
  const { bounds } = display;
  const x = Math.round(bounds.x + (bounds.width - 680) / 2);
  const y = Math.round(bounds.y + bounds.height * 0.28);
  chatBarWindow.setPosition(x, y);
  chatBarWindow.show();
  chatBarWindow.focus();
  // Trigger rehydration so the chat bar picks up any auth/model changes
  // that happened in the main window since the chat bar last loaded.
  chatBarWindow.webContents.send("chatbar:rehydrate");
}

// ── IPC handlers (registered once at startup) ─────────────────────────────────

function registerIpcHandlers(): void {
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

  // IPC: open URL in system browser
  ipcMain.on("shell:openExternal", (_event, url: string) => {
    shell.openExternal(url);
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

  // ── App storage IPC ─────────────────────────────────────────────────────────
  ipcMain.handle("storage:getItem", (_event, key: string) => appStorageData[key] ?? null);

  ipcMain.handle("storage:setItem", (_event, key: string, value: string) => {
    appStorageData[key] = value;
    saveAppStorage();
  });

  ipcMain.handle("storage:removeItem", (_event, key: string) => {
    delete appStorageData[key];
    saveAppStorage();
  });

  // ── Chat bar IPC ─────────────────────────────────────────────────────────────

  // Get current hotkey
  ipcMain.handle("chatbar:getHotkey", () => currentHotkey);

  // Update hotkey from settings
  ipcMain.handle("chatbar:setHotkey", (_event, hotkey: string) => {
    try {
      globalShortcut.unregister(currentHotkey);
      const ok = globalShortcut.register(hotkey, toggleChatBar);
      if (!ok) {
        // Re-register old one if new one failed
        globalShortcut.register(currentHotkey, toggleChatBar);
        return { success: false, error: "Hotkey already in use or invalid" };
      }
      currentHotkey = hotkey;
      saveChatBarConfig({ hotkey });
      return { success: true };
    } catch (e) {
      globalShortcut.register(currentHotkey, toggleChatBar);
      return { success: false, error: String(e) };
    }
  });

  // Hide chat bar from renderer
  ipcMain.on("chatbar:hide", () => {
    chatBarWindow?.hide();
    chatBarWindow?.setSize(680, 72);
  });

  // Resize chat bar (for model picker expansion)
  ipcMain.on("chatbar:setHeight", (_event, height: number) => {
    if (!chatBarWindow) return;
    const [x, y] = chatBarWindow.getPosition();
    chatBarWindow.setSize(680, Math.max(72, Math.min(500, height)));
    chatBarWindow.setPosition(x, y);
  });

  // Chat bar submit → forward to main window and focus it
  ipcMain.on("chatbar:submit", (_event, payload: { query: string; modelId: string }) => {
    chatBarWindow?.hide();
    chatBarWindow?.setSize(680, 72);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send("chatbar:incoming", payload);
    }
  });
}

// ── Main window ───────────────────────────────────────────────────────────────

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 650,
    minHeight: 300,
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
  // Load persisted storage before any window is created
  loadAppStorage();

  // Set dock icon only in dev — electron-builder injects it for production builds
  if (process.env.NODE_ENV === "development" && process.platform === "darwin" && app.dock) {
    try {
      const iconPath = path.join(__dirname, "../../build/icon.png");
      app.dock.setIcon(iconPath);
    } catch {
      // Icon not available in this environment, ignore
    }
  }

  registerIpcHandlers();
  createWindow();
  createChatBarWindow();

  // Register global shortcut for chat bar
  const config = loadChatBarConfig();
  currentHotkey = config.hotkey;
  globalShortcut.register(currentHotkey, toggleChatBar);
});

app.on("before-quit", () => {
  isQuitting = true;
  // Flush in-memory storage to disk (defence against Ctrl+C / SIGTERM in dev)
  saveAppStorage();
  // Also flush Chromium's own DOMStorage write-behind buffer
  session.defaultSession.flushStorageData();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow?.show();
  }
});
