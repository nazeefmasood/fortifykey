import { create } from "zustand";
import { VAULT_LOCK_TIMEOUT_MS } from "@fortifykey/shared";

interface MasterKeyState {
  vaultKey: CryptoKey | null;
  isUnlocked: boolean;
  lockTimeoutId: ReturnType<typeof setTimeout> | null;

  setVaultKey: (key: CryptoKey) => void;
  lock: () => void;
  resetLockTimer: () => void;
}

export const useMasterKeyStore = create<MasterKeyState>((set, get) => ({
  vaultKey: null,
  isUnlocked: false,
  lockTimeoutId: null,

  setVaultKey: (key: CryptoKey) => {
    set({ vaultKey: key, isUnlocked: true });
    get().resetLockTimer();
  },

  lock: () => {
    const { lockTimeoutId } = get();
    if (lockTimeoutId) clearTimeout(lockTimeoutId);
    set({ vaultKey: null, isUnlocked: false, lockTimeoutId: null });
  },

  resetLockTimer: () => {
    const { lockTimeoutId } = get();
    if (lockTimeoutId) clearTimeout(lockTimeoutId);

    const newTimeout = setTimeout(() => {
      get().lock();
    }, VAULT_LOCK_TIMEOUT_MS);

    set({ lockTimeoutId: newTimeout });
  },
}));
