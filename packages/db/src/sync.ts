import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_SYNC_RETRIES } from "@fortifykey/shared";
import { db, type LocalVaultItem, type LocalCategory } from "./schema";
import { markLocalWrite } from "./echo-guard";

/**
 * Push all pending local changes to Supabase.
 */
export async function pushChanges(supabase: SupabaseClient): Promise<void> {
  const pending = await db.syncQueue.orderBy("created_at").toArray();

  for (const entry of pending) {
    try {
      const payload = JSON.parse(entry.payload);

      switch (entry.operation) {
        case "INSERT": {
          const { error } = await supabase
            .from(entry.table_name)
            .insert(payload);
          if (error) throw error;
          break;
        }
        case "UPDATE": {
          const newVersion = (payload.version ?? 0) + 1;
          const { error } = await supabase
            .from(entry.table_name)
            .update({ ...payload, version: newVersion })
            .eq("id", entry.item_id)
            .eq("version", payload.version);

          if (error) {
            // Version conflict — mark for resolution
            await db.vaultItems.update(entry.item_id, {
              sync_status: "conflict",
            });
            continue;
          }

          markLocalWrite(entry.item_id, newVersion);
          break;
        }
        case "DELETE": {
          const { error } = await supabase
            .from(entry.table_name)
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", entry.item_id);
          if (error) throw error;
          break;
        }
      }

      // Remove from queue on success
      if (entry.id != null) {
        await db.syncQueue.delete(entry.id);
      }
      await db.vaultItems.update(entry.item_id, { sync_status: "synced" });
    } catch {
      entry.retry_count++;
      if (entry.retry_count > 5) {
        // Dead letter — remove from queue
        if (entry.id != null) {
          await db.syncQueue.delete(entry.id);
        }
      } else {
        await db.syncQueue.put(entry);
      }
    }
  }
}

/**
 * Pull changes from Supabase since last sync.
 */
export async function pullChanges(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const lastSync = await db.metadata.get("last_sync_timestamp");
  const since = lastSync?.value ?? "1970-01-01T00:00:00Z";

  const { data, error } = await supabase
    .from("vault_items")
    .select("*")
    .eq("user_id", userId)
    .gt("updated_at", since)
    .order("updated_at", { ascending: true });

  if (error || !data) return;

  for (const serverItem of data) {
    const localItem = await db.vaultItems.get(serverItem.id);

    if (!localItem) {
      // New from server
      await db.vaultItems.put({ ...serverItem, sync_status: "synced" } as unknown as LocalVaultItem);
    } else if (localItem.sync_status === "pending_push") {
      // Local has unpushed changes — server wins if higher version
      if (serverItem.version > localItem.version) {
        await db.vaultItems.put({ ...serverItem, sync_status: "synced" } as unknown as LocalVaultItem);
      }
    } else {
      // No local changes, accept server version
      await db.vaultItems.put({ ...serverItem, sync_status: "synced" } as unknown as LocalVaultItem);
    }
  }

  // Also pull categories
  const { data: catData } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", userId);

  if (catData) {
    for (const cat of catData) {
      await db.categories.put({ ...cat, sync_status: "synced" } as unknown as LocalCategory);
    }
  }

  // Update sync cursor
  if (data.length > 0) {
    const maxUpdated = data[data.length - 1]!.updated_at;
    await db.metadata.put({
      key: "last_sync_timestamp",
      value: maxUpdated,
    });
  }
}

/**
 * Initial sync: download entire vault on first login.
 */
export async function initialSync(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  // Fetch all non-deleted vault items
  const { data: items } = await supabase
    .from("vault_items")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (items?.length) {
    await db.vaultItems.bulkPut(
      items.map((item: Record<string, unknown>) => ({ ...item, sync_status: "synced" as const }) as unknown as LocalVaultItem)
    );

    const timestamps = items.map((d: Record<string, unknown>) =>
      new Date(d.updated_at as string).getTime()
    );
    const maxUpdated = new Date(Math.max(...timestamps)).toISOString();
    await db.metadata.put({ key: "last_sync_timestamp", value: maxUpdated });
  }

  // Fetch categories
  const { data: cats } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", userId);

  if (cats?.length) {
    await db.categories.bulkPut(
      cats.map((cat: Record<string, unknown>) => ({ ...cat, sync_status: "synced" as const }) as unknown as LocalCategory)
    );
  }
}
