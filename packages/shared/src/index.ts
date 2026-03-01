// Types
export type * from "./types";

// Encryption
export {
  deriveKey,
  generateVaultKey,
  encryptVaultKey,
  decryptVaultKey,
  encryptString,
  decryptString,
  encryptPayload,
  decryptPayload,
  generateSalt,
  toBase64,
  fromBase64,
} from "./encryption";

// Password generator
export { generatePassword, classifyChar } from "./password-generator";

// Password strength
export { calculateStrength, strengthColor } from "./password-strength";

// Domain utilities
export { normalizeDomain, domainMatches } from "./domain-utils";

// Supabase client
export {
  createClerkSupabaseClient,
  createServiceSupabaseClient,
} from "./supabase-client";

// Constants
export {
  VAULT_LOCK_TIMEOUT_MS,
  PBKDF2_ITERATIONS,
  MAX_SYNC_RETRIES,
  DEFAULT_GENERATOR_CONFIG,
  ITEM_TYPE_LABELS,
  ITEM_TYPE_ICONS,
} from "./constants";
