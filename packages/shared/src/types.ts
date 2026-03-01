// ===== Vault Item Types =====

export type ItemType =
  | "login"
  | "card"
  | "note"
  | "identity"
  | "wifi"
  | "license"
  | "backup_codes";

export type PasswordStrengthLabel = "strong" | "medium" | "weak";

export interface EncryptedField {
  ct: string; // base64 ciphertext
  iv: string; // base64 12-byte IV
  v: number; // schema version
}

// ===== Vault Item (DB row) =====

export interface VaultItem {
  id: string;
  user_id: string;
  item_type: ItemType;
  name: string;
  domain: string | null;
  category_id: string | null;
  favorite: boolean;
  encrypted_data: EncryptedField;
  icon_url: string | null;
  password_strength: number | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
}

// ===== Decrypted Payload Types =====

export interface LoginPayload {
  urls: string[];
  username: string;
  password: string;
  totp_secret?: string;
  totp_digits?: number;
  totp_period?: number;
  custom_fields: Array<{
    name: string;
    value: string;
    type: "text" | "hidden" | "boolean";
  }>;
  notes: string;
}

export interface CardPayload {
  cardholder_name: string;
  card_number: string;
  expiry_month: string;
  expiry_year: string;
  cvv: string;
  card_type: string;
  pin?: string;
  billing_address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  notes: string;
}

export interface NotePayload {
  content: string;
  attachments: Array<{
    filename: string;
    mime_type: string;
    size: number;
    encrypted_blob_key: string;
  }>;
}

export interface IdentityPayload {
  document_type: "passport" | "national_id" | "drivers_license" | "other";
  full_name: string;
  document_number: string;
  issuing_country: string;
  issuing_authority?: string;
  issue_date?: string;
  expiry_date?: string;
  date_of_birth?: string;
  gender?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  license_class?: string;
  restrictions?: string;
  notes: string;
}

export interface WifiPayload {
  ssid: string;
  password: string;
  security_type: "WPA2" | "WPA3" | "WEP" | "Open" | "WPA2-Enterprise";
  hidden_network: boolean;
  notes: string;
}

export interface LicensePayload {
  product_name: string;
  license_key: string;
  registered_email?: string;
  registered_name?: string;
  version?: string;
  purchase_date?: string;
  expiry_date?: string;
  max_devices?: number;
  activation_url?: string;
  notes: string;
}

export interface BackupCodesPayload {
  service_name: string;
  service_url?: string;
  codes: Array<{
    code: string;
    used: boolean;
  }>;
  notes: string;
}

export type VaultPayload =
  | LoginPayload
  | CardPayload
  | NotePayload
  | IdentityPayload
  | WifiPayload
  | LicensePayload
  | BackupCodesPayload;

// ===== Decrypted Vault Item (for UI) =====

export interface DecryptedVaultItem<T extends VaultPayload = VaultPayload>
  extends Omit<VaultItem, "encrypted_data"> {
  data: T;
}

// ===== Category =====

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string | null;
  sort_order: number;
  created_at: string;
}

// ===== User Keys =====

export interface UserKeys {
  id: string;
  user_id: string;
  encrypted_vault_key: EncryptedField;
  key_salt: string;
  key_iterations: number;
  password_hint: string | null;
  created_at: string;
}

// ===== Generator Config =====

export interface GeneratorConfig {
  length: number;
  wordPercentage: number;
  specialPercentage: number;
  numberPercentage: number;
}

// ===== Sync =====

export type SyncStatus = "synced" | "pending_push" | "conflict";
export type SyncOperation = "INSERT" | "UPDATE" | "DELETE";

export interface SyncQueueEntry {
  id?: number;
  item_id: string;
  table_name: string;
  operation: SyncOperation;
  payload: string;
  created_at: string;
  retry_count: number;
}

// ===== Platform =====

export type Platform = "web" | "desktop" | "pwa";
