// Extension storage utilities
// State is stored in chrome.storage.local

export interface VaultState {
  isUnlocked: boolean;
  userId: string | null;
  vaultKey: CryptoKey | null; // Not persisted - held in memory only
  encryptedVaultKey: string | null;
  keySalt: string | null;
  lastActivity: number;
}

export interface StoredData {
  // Persisted in chrome.storage.local
  userId: string | null;
  email: string | null;
  encryptedVaultKey: string | null;
  keySalt: string | null;
  vaultItems: EncryptedItem[];
  categories: Category[];
  lastSync: string | null;
  lockTimeout: number; // minutes
}

export interface EncryptedItem {
  id: string;
  user_id: string;
  item_type: string;
  name: string;
  domain: string | null;
  category_id: string | null;
  encrypted_data: string;
  icon_url: string | null;
  password_strength: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

// In-memory state (not persisted)
let memoryState: VaultState = {
  isUnlocked: false,
  userId: null,
  vaultKey: null,
  encryptedVaultKey: null,
  keySalt: null,
  lastActivity: Date.now(),
};

export function getMemoryState(): VaultState {
  return memoryState;
}

export function setMemoryState(state: Partial<VaultState>): void {
  memoryState = { ...memoryState, ...state };
}

export function getVaultKey(): CryptoKey | null {
  return memoryState.vaultKey;
}

export function setVaultKey(key: CryptoKey | null): void {
  memoryState.vaultKey = key;
  memoryState.isUnlocked = key !== null;
  memoryState.lastActivity = Date.now();
}

export function resetLockTimer(): void {
  memoryState.lastActivity = Date.now();
}

// Chrome storage helpers
export async function getStoredData(): Promise<StoredData> {
  const result = await chrome.storage.local.get([
    "userId",
    "email",
    "encryptedVaultKey",
    "keySalt",
    "vaultItems",
    "categories",
    "lastSync",
    "lockTimeout",
  ]);

  return {
    userId: result.userId ?? null,
    email: result.email ?? null,
    encryptedVaultKey: result.encryptedVaultKey ?? null,
    keySalt: result.keySalt ?? null,
    vaultItems: result.vaultItems ?? [],
    categories: result.categories ?? [],
    lastSync: result.lastSync ?? null,
    lockTimeout: result.lockTimeout ?? 15,
  };
}

export async function setStoredData(data: Partial<StoredData>): Promise<void> {
  await chrome.storage.local.set(data);
}

export async function clearStoredData(): Promise<void> {
  await chrome.storage.local.clear();
  memoryState = {
    isUnlocked: false,
    userId: null,
    vaultKey: null,
    encryptedVaultKey: null,
    keySalt: null,
    lastActivity: Date.now(),
  };
}
