import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ActivityPlatform = "web" | "desktop" | "extension" | "pwa";

export type ActivityAction =
  | "vault_unlocked"
  | "vault_locked"
  | "item_created"
  | "item_viewed"
  | "item_edited"
  | "item_deleted"
  | "item_copied"
  | "password_generated"
  | "category_created"
  | "category_deleted"
  | "sync_started"
  | "sync_completed"
  | "sync_failed"
  | "export_vault"
  | "settings_changed";

export interface ActivityLogEntry {
  id: string;
  timestamp: number;
  action: ActivityAction;
  details: string;
  platform: ActivityPlatform;
  metadata?: Record<string, unknown>;
}

// Detect current platform
function detectPlatform(): ActivityPlatform {
  if (typeof window === "undefined") return "web";

  // Check for Electron
  if ((window as unknown as Record<string, unknown>).__ELECTRON__) {
    return "desktop";
  }

  // Check for PWA
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return "pwa";
  }

  // Check for extension context
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id) {
    return "extension";
  }

  return "web";
}

interface ActivityLogState {
  entries: ActivityLogEntry[];
  log: (action: ActivityAction, details: string, metadata?: Record<string, unknown>) => void;
  clearLogs: () => void;
  getRecentEntries: (count?: number) => ActivityLogEntry[];
  getEntriesByAction: (action: ActivityAction) => ActivityLogEntry[];
}

const MAX_LOG_ENTRIES = 500;

export const useActivityLog = create<ActivityLogState>()(
  persist(
    (set, get) => ({
      entries: [],

      log: (action, details, metadata) => {
        const entry: ActivityLogEntry = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          action,
          details,
          platform: detectPlatform(),
          metadata,
        };

        set((state) => {
          const newEntries = [entry, ...state.entries];
          // Keep only the last MAX_LOG_ENTRIES
          if (newEntries.length > MAX_LOG_ENTRIES) {
            return { entries: newEntries.slice(0, MAX_LOG_ENTRIES) };
          }
          return { entries: newEntries };
        });
      },

      clearLogs: () => {
        set({ entries: [] });
      },

      getRecentEntries: (count = 50) => {
        return get().entries.slice(0, count);
      },

      getEntriesByAction: (action) => {
        return get().entries.filter((e) => e.action === action);
      },
    }),
    {
      name: "fortifykey-activity-log",
    }
  )
);

// Action labels for display
export const actionLabels: Record<ActivityAction, string> = {
  vault_unlocked: "Vault Unlocked",
  vault_locked: "Vault Locked",
  item_created: "Item Created",
  item_viewed: "Item Viewed",
  item_edited: "Item Edited",
  item_deleted: "Item Deleted",
  item_copied: "Password Copied",
  password_generated: "Password Generated",
  category_created: "Category Created",
  category_deleted: "Category Deleted",
  sync_started: "Sync Started",
  sync_completed: "Sync Completed",
  sync_failed: "Sync Failed",
  export_vault: "Vault Exported",
  settings_changed: "Settings Changed",
};

// Action icons (Lucide icon names)
export const actionIcons: Record<ActivityAction, string> = {
  vault_unlocked: "Unlock",
  vault_locked: "Lock",
  item_created: "Plus",
  item_viewed: "Eye",
  item_edited: "Pencil",
  item_deleted: "Trash2",
  item_copied: "Copy",
  password_generated: "Wand2",
  category_created: "FolderPlus",
  category_deleted: "FolderMinus",
  sync_started: "RefreshCw",
  sync_completed: "Check",
  sync_failed: "X",
  export_vault: "Download",
  settings_changed: "Settings",
};
