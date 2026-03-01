/** Auto-lock vault after this many milliseconds of inactivity */
export const VAULT_LOCK_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

/** PBKDF2 iteration count for key derivation */
export const PBKDF2_ITERATIONS = 600_000;

/** Maximum sync queue retry count before giving up */
export const MAX_SYNC_RETRIES = 5;

/** Default password generator config */
export const DEFAULT_GENERATOR_CONFIG = {
  length: 20,
  wordPercentage: 50,
  specialPercentage: 25,
  numberPercentage: 25,
} as const;

/** Item type labels for display */
export const ITEM_TYPE_LABELS: Record<string, string> = {
  login: "Login",
  card: "Credit Card",
  note: "Secure Note",
  identity: "Identity",
  wifi: "WiFi",
  license: "Software License",
  backup_codes: "Backup Codes",
} as const;

/** Item type icons (Lucide icon names) */
export const ITEM_TYPE_ICONS: Record<string, string> = {
  login: "globe",
  card: "credit-card",
  note: "file-text",
  identity: "id-card",
  wifi: "wifi",
  license: "key",
  backup_codes: "shield",
} as const;
