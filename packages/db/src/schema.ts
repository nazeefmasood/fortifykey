import Dexie, { type Table } from "dexie";
import type { EncryptedField, SyncStatus, SyncOperation } from "@fortifykey/shared";

// ===== Local DB Types =====

export interface LocalVaultItem {
  id: string;
  user_id: string;
  item_type: string;
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
  sync_status: SyncStatus;
}

export interface LocalCategory {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string | null;
  sort_order: number;
  created_at: string;
  sync_status: SyncStatus;
}

export interface LocalSyncQueue {
  id?: number;
  item_id: string;
  table_name: string;
  operation: SyncOperation;
  payload: string;
  created_at: string;
  retry_count: number;
}

export interface LocalMetadata {
  key: string;
  value: string;
}

// ===== Database Definition =====

export class FortifyKeyDB extends Dexie {
  vaultItems!: Table<LocalVaultItem, string>;
  categories!: Table<LocalCategory, string>;
  syncQueue!: Table<LocalSyncQueue, number>;
  metadata!: Table<LocalMetadata, string>;

  constructor() {
    super("fortifykey");

    this.version(1).stores({
      vaultItems:
        "id, user_id, item_type, name, domain, category_id, favorite, sync_status, updated_at, [user_id+item_type], [user_id+domain]",
      categories: "id, user_id, name, sync_status, [user_id+name]",
      syncQueue: "++id, item_id, created_at",
      metadata: "key",
    });
  }
}

export const db = new FortifyKeyDB();
