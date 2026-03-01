// Service Worker - Main background script for extension
// Handles vault state, auto-lock, message passing

import {
  getStoredData,
  setStoredData,
  getMemoryState,
  setVaultKey,
  resetLockTimer,
  clearStoredData,
  type EncryptedItem,
} from "../lib/storage";
import {
  deriveKey,
  decryptVaultKey,
  decryptPayload,
  generateSalt,
  encryptVaultKey,
  generateVaultKey,
} from "../lib/encryption";
import { createMessageHandler, type MessageType } from "../lib/messaging";
import { generatePassword, type GeneratorConfig } from "../lib/password-generator";

const AUTO_LOCK_ALARM = "autoLock";

// ===== Message Handlers =====

const messageHandlers: Partial<Record<MessageType, (payload: unknown) => Promise<unknown>>> = {
  // Unlock vault with master password
  UNLOCK_VAULT: async (payload) => {
    const { masterPassword } = payload as { masterPassword: string };
    const stored = await getStoredData();

    if (!stored.encryptedVaultKey || !stored.keySalt) {
      // First-time setup: create vault key
      const salt = generateSalt();
      const masterKey = await deriveKey(masterPassword, salt);
      const vaultKey = await generateVaultKey();
      const encryptedVaultKey = await encryptVaultKey(vaultKey, masterKey);

      await setStoredData({
        encryptedVaultKey,
        keySalt: salt,
      });

      setVaultKey(vaultKey);
      return { success: true, isNew: true };
    }

    // Unlock existing vault
    const masterKey = await deriveKey(masterPassword, stored.keySalt);
    const vaultKey = await decryptVaultKey(stored.encryptedVaultKey, masterKey);
    setVaultKey(vaultKey);

    return { success: true, isNew: false };
  },

  // Lock vault
  LOCK_VAULT: async () => {
    setVaultKey(null);
    return { success: true };
  },

  // Get vault state
  GET_VAULT_STATE: async () => {
    const memory = getMemoryState();
    const stored = await getStoredData();
    return {
      isUnlocked: memory.isUnlocked,
      hasVault: !!stored.encryptedVaultKey,
      userId: stored.userId,
      email: stored.email,
      itemCount: stored.vaultItems.length,
    };
  },

  // Get all vault items
  GET_VAULT_ITEMS: async () => {
    const memory = getMemoryState();
    if (!memory.isUnlocked || !memory.vaultKey) {
      throw new Error("Vault is locked");
    }

    const stored = await getStoredData();
    const decrypted = await Promise.all(
      stored.vaultItems
        .filter((item) => !item.deleted_at)
        .map(async (item) => {
          try {
            const data = await decryptPayload<unknown>(item.encrypted_data, memory.vaultKey!);
            return { ...item, data };
          } catch {
            return null;
          }
        })
    );

    return { items: decrypted.filter(Boolean) };
  },

  // Get items matching current domain
  GET_MATCHING_ITEMS: async (payload) => {
    const { domain } = payload as { domain: string };
    const memory = getMemoryState();
    if (!memory.isUnlocked || !memory.vaultKey) {
      throw new Error("Vault is locked");
    }

    const stored = await getStoredData();
    const normalizedDomain = normalizeDomain(domain);

    const matches = stored.vaultItems.filter((item) => {
      if (item.deleted_at || item.item_type !== "login") return false;
      if (!item.domain) return false;
      return domainsMatch(item.domain, normalizedDomain);
    });

    const decrypted = await Promise.all(
      matches.map(async (item) => {
        try {
          const data = await decryptPayload<{ username?: string; password?: string }>(
            item.encrypted_data,
            memory.vaultKey!
          );
          return { ...item, data };
        } catch {
          return null;
        }
      })
    );

    return { items: decrypted.filter(Boolean) };
  },

  // Add new item
  ADD_ITEM: async (payload) => {
    const memory = getMemoryState();
    if (!memory.isUnlocked || !memory.vaultKey) {
      throw new Error("Vault is locked");
    }

    const { itemType, name, domain, payload: itemPayload } = payload as {
      itemType: string;
      name: string;
      domain: string | null;
      payload: unknown;
    };

    const stored = await getStoredData();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Encrypt the payload
    const { encryptPayload } = await import("../lib/encryption");
    const encryptedData = await encryptPayload(itemPayload, memory.vaultKey);

    const item: EncryptedItem = {
      id,
      user_id: stored.userId ?? "local",
      item_type: itemType,
      name,
      domain: domain ? normalizeDomain(domain) : null,
      category_id: null,
      encrypted_data: encryptedData,
      icon_url: null,
      password_strength: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      version: 1,
    };

    await setStoredData({
      vaultItems: [...stored.vaultItems, item],
    });

    return { success: true, id };
  },

  // Generate password
  GENERATE_PASSWORD: async (payload) => {
    const config = payload as GeneratorConfig;
    const password = generatePassword(config);
    return { password };
  },

  // Sync with Supabase (placeholder - would need Clerk JWT)
  SYNC_VAULT: async () => {
    // TODO: Implement sync with Supabase using Clerk JWT
    // For now, just return success
    return { success: true, message: "Sync not yet implemented" };
  },
};

// ===== Domain Matching =====

function normalizeDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    let domain = parsed.hostname.toLowerCase();
    // Remove www. prefix
    if (domain.startsWith("www.")) {
      domain = domain.slice(4);
    }
    return domain;
  } catch {
    return url.toLowerCase().replace(/^www\./, "");
  }
}

function domainsMatch(stored: string, current: string): boolean {
  const s = stored.toLowerCase();
  const c = current.toLowerCase();

  // Exact match
  if (s === c) return true;

  // Subdomain match: stored is parent of current
  if (c.endsWith("." + s)) return true;

  return false;
}

// ===== Auto-Lock =====

async function setupAutoLock() {
  const stored = await getStoredData();
  const timeout = stored.lockTimeout || 15;

  chrome.alarms.clear(AUTO_LOCK_ALARM);
  chrome.alarms.create(AUTO_LOCK_ALARM, {
    delayInMinutes: timeout,
  });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === AUTO_LOCK_ALARM) {
    const memory = getMemoryState();
    if (memory.isUnlocked) {
      // Check if there's been activity
      const inactiveMs = Date.now() - memory.lastActivity;
      const stored = await getStoredData();
      const timeoutMs = (stored.lockTimeout || 15) * 60 * 1000;

      if (inactiveMs >= timeoutMs) {
        setVaultKey(null);
        // Notify any open popups
        chrome.runtime.sendMessage({ type: "VAULT_LOCKED" }).catch(() => {});
      } else {
        // Reschedule
        setupAutoLock();
      }
    }
  }
});

// Reset lock timer on activity
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "ACTIVITY") {
    resetLockTimer();
  }
  return false;
});

// ===== Install/Startup =====

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    console.log("FortifyKey extension installed");
  }
  await setupAutoLock();
});

chrome.runtime.onStartup.addListener(async () => {
  await setupAutoLock();
});

// ===== Message Listener =====

chrome.runtime.onMessage.addListener(
  createMessageHandler(messageHandlers)
);

export {};
