// Electron desktop API types
// This file is auto-included by TypeScript

interface DesktopAPI {
  platform: NodeJS.Platform;
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
  };
  vault: {
    onLockRequest: (callback: () => void) => () => void;
    notifyUnlocked: () => Promise<void>;
    notifyLocked: () => Promise<void>;
    notifyActivity: () => Promise<void>;
  };
  quickCopy: {
    onRequest: (callback: (domain: string) => void) => () => void;
  };
  password: {
    onGenerateRequest: (callback: () => void) => () => void;
  };
  notification: {
    show: (title: string, body: string) => Promise<void>;
  };
  store: {
    get: <T>(key: string) => Promise<T | undefined>;
    set: <T>(key: string, value: T) => Promise<void>;
  };
}

declare global {
  interface Window {
    fortifykeyDesktop?: DesktopAPI;
  }
}

export {};
