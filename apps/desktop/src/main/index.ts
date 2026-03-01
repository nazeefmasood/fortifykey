// Electron Main Process
// Handles window management, system tray, global shortcuts, and IPC

import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  globalShortcut,
  ipcMain,
  shell,
  Notification,
  type MenuItemConstructorOptions,
} from "electron";
import * as path from "path";
import Store from "electron-store";

// Types
interface StoreSchema {
  windowBounds: { x: number; y: number; width: number; height: number } | null;
  startMinimized: boolean;
  autoLockMinutes: number;
}

// Config store
const store = new Store<StoreSchema>({
  defaults: {
    windowBounds: null,
    startMinimized: false,
    autoLockMinutes: 15,
  },
});

// State
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let lockTimer: NodeJS.Timeout | null = null;

// Constants
const WEB_URL = process.env.WEB_URL || "http://localhost:3000";
const GLOBAL_SHORTCUT = "CommandOrControl+Shift+P";

// ===== Window Management =====

function createWindow(): BrowserWindow {
  const savedBounds = store.get("windowBounds");

  const win = new BrowserWindow({
    width: savedBounds?.width ?? 1200,
    height: savedBounds?.height ?? 800,
    x: savedBounds?.x,
    y: savedBounds?.y,
    minWidth: 800,
    minHeight: 600,
    frame: false, // Frameless for custom titlebar
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 16, y: 16 }, // macOS traffic lights
    backgroundColor: "#1a1a2e",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    show: !store.get("startMinimized"),
    icon: getIconPath(),
  });

  // Load the Next.js app
  if (process.env.NODE_ENV === "development") {
    win.loadURL(WEB_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    // In production, load from built files or server
    win.loadURL(WEB_URL);
  }

  // Save window bounds on move/resize
  win.on("moved", () => saveBounds(win));
  win.on("resized", () => saveBounds(win));

  // Handle close - minimize to tray instead
  win.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });

  // Mark window as electron for platform detection
  win.webContents.executeJavaScript("window.__ELECTRON__ = true;");

  // Handle external links
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  return win;
}

function saveBounds(win: BrowserWindow) {
  const bounds = win.getBounds();
  store.set("windowBounds", bounds);
}

function getIconPath(): string {
  const iconDir = path.join(__dirname, "../../assets");
  if (process.platform === "darwin") {
    return path.join(iconDir, "icon.png");
  } else if (process.platform === "win32") {
    return path.join(iconDir, "icon.ico");
  }
  return path.join(iconDir, "icon.png");
}

// ===== System Tray =====

function createTray(): Tray {
  const icon = nativeImage.createFromPath(getIconPath());
  const trayIcon = process.platform === "darwin" ? icon.resize({ width: 16, height: 16 }) : icon;

  tray = new Tray(trayIcon);
  tray.setToolTip("FortifyKey");
  updateTrayMenu(false);

  tray.on("double-click", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  return tray;
}

function updateTrayMenu(isUnlocked: boolean) {
  if (!tray) return;

  const quickItems: MenuItemConstructorOptions[] = isUnlocked
    ? [
        {
          label: "Quick Copy...",
          submenu: [
            { label: "Last Used", click: () => sendQuickCopy("last") },
            { label: "Google", click: () => sendQuickCopy("google.com") },
            { label: "GitHub", click: () => sendQuickCopy("github.com") },
          ],
        },
        { type: "separator" },
        { label: "Generate Password", click: () => generatePassword() },
        { type: "separator" },
      ]
    : [];

  const contextMenu = Menu.buildFromTemplate([
    {
      label: isUnlocked ? "Open Vault" : "Unlock Vault",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    ...quickItems,
    {
      label: isUnlocked ? "Lock Vault" : "Lock Vault",
      enabled: isUnlocked,
      click: () => lockVault(),
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

// ===== Global Shortcut =====

function registerGlobalShortcut() {
  const ret = globalShortcut.register(GLOBAL_SHORTCUT, () => {
    if (!mainWindow) return;

    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  if (!ret) {
    console.error("Failed to register global shortcut");
  }
}

// ===== IPC Handlers =====

ipcMain.handle("window:minimize", () => {
  mainWindow?.minimize();
});

ipcMain.handle("window:maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle("window:close", () => {
  mainWindow?.hide();
});

ipcMain.handle("window:isMaximized", () => {
  return mainWindow?.isMaximized() ?? false;
});

ipcMain.handle("vault:unlocked", () => {
  updateTrayMenu(true);
  startAutoLockTimer();
});

ipcMain.handle("vault:locked", () => {
  updateTrayMenu(false);
  stopAutoLockTimer();
});

ipcMain.handle("vault:activity", () => {
  resetAutoLockTimer();
});

ipcMain.handle("notification:show", (_event, { title, body }: { title: string; body: string }) => {
  new Notification({ title, body, icon: getIconPath() }).show();
});

ipcMain.handle("store:get", (_event, key: keyof StoreSchema) => {
  return store.get(key);
});

ipcMain.handle("store:set", (_event, key: keyof StoreSchema, value: unknown) => {
  store.set(key, value);
});

// ===== Auto-lock =====

function startAutoLockTimer() {
  stopAutoLockTimer();
  const minutes = store.get("autoLockMinutes") || 15;
  lockTimer = setTimeout(() => {
    lockVault();
    showNotification("Vault Locked", "Your vault has been locked due to inactivity");
  }, minutes * 60 * 1000);
}

function stopAutoLockTimer() {
  if (lockTimer) {
    clearTimeout(lockTimer);
    lockTimer = null;
  }
}

function resetAutoLockTimer() {
  if (lockTimer) {
    startAutoLockTimer();
  }
}

function lockVault() {
  mainWindow?.webContents.send("vault:lock");
  updateTrayMenu(false);
  stopAutoLockTimer();
}

function sendQuickCopy(domain: string) {
  mainWindow?.webContents.send("quickCopy:request", domain);
}

function generatePassword() {
  mainWindow?.webContents.send("password:generate");
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
}

function showNotification(title: string, body: string) {
  new Notification({ title, body, icon: getIconPath() }).show();
}

// ===== App Lifecycle =====

app.whenReady().then(() => {
  mainWindow = createWindow();
  createTray();
  registerGlobalShortcut();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

// Security: Prevent navigation to external URLs in main window
app.on("web-contents-created", (_event, contents) => {
  contents.on("will-navigate", (event, url) => {
    const parsedUrl = new URL(url);
    const allowedOrigins = ["localhost", "fortifykey.app"];

    if (!allowedOrigins.includes(parsedUrl.hostname)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
});
