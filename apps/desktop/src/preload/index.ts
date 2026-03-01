// Preload Script
// Exposes safe APIs from main process to renderer via contextBridge

import { contextBridge, ipcRenderer } from "electron";

// Types for the exposed API
interface DesktopAPI {
  platform: NodeJS.Platform;
  // Window controls
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
  };
  // Vault state
  vault: {
    onUnlocked: (callback: () => void) => () => void;
    onLocked: (callback: () => void) => () => void;
    onLockRequest: (callback: () => void) => () => void;
    notifyUnlocked: () => Promise<void>;
    notifyLocked: () => Promise<void>;
    notifyActivity: () => Promise<void>;
  };
  // Quick copy (from tray)
  quickCopy: {
    onRequest: (callback: (domain: string) => void) => () => void;
  };
  // Password generation (from tray)
  password: {
    onGenerateRequest: (callback: () => void) => () => void;
  };
  // Notifications
  notification: {
    show: (title: string, body: string) => Promise<void>;
  };
  // Persistent storage
  store: {
    get: <T>(key: string) => Promise<T | undefined>;
    set: <T>(key: string, value: T) => Promise<void>;
  };
}

const api: DesktopAPI = {
  platform: process.platform,

  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close: () => ipcRenderer.invoke("window:close"),
    isMaximized: () => ipcRenderer.invoke("window:isMaximized"),
  },

  vault: {
    onUnlocked: (callback) => {
      ipcRenderer.on("vault:unlocked", callback);
      return () => ipcRenderer.removeListener("vault:unlocked", callback);
    },
    onLocked: (callback) => {
      ipcRenderer.on("vault:locked", callback);
      return () => ipcRenderer.removeListener("vault:locked", callback);
    },
    onLockRequest: (callback) => {
      ipcRenderer.on("vault:lock", callback);
      return () => ipcRenderer.removeListener("vault:lock", callback);
    },
    notifyUnlocked: () => ipcRenderer.invoke("vault:unlocked"),
    notifyLocked: () => ipcRenderer.invoke("vault:locked"),
    notifyActivity: () => ipcRenderer.invoke("vault:activity"),
  },

  quickCopy: {
    onRequest: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, domain: string) => callback(domain);
      ipcRenderer.on("quickCopy:request", handler);
      return () => ipcRenderer.removeListener("quickCopy:request", handler);
    },
  },

  password: {
    onGenerateRequest: (callback) => {
      const handler = () => callback();
      ipcRenderer.on("password:generate", handler);
      return () => ipcRenderer.removeListener("password:generate", handler);
    },
  },

  notification: {
    show: (title, body) => ipcRenderer.invoke("notification:show", { title, body }),
  },

  store: {
    get: (key) => ipcRenderer.invoke("store:get", key),
    set: (key, value) => ipcRenderer.invoke("store:set", key, value),
  },
};

// Expose to renderer
contextBridge.exposeInMainWorld("fortifykeyDesktop", api);

// Type declaration for renderer
declare global {
  interface Window {
    fortifykeyDesktop: DesktopAPI;
  }
}
