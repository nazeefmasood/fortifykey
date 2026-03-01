import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import { db } from "./schema";
import { isEcho } from "./echo-guard";
import { pullChanges } from "./sync";

export interface VaultItemChange {
  type: "added" | "updated" | "deleted";
  itemId: string;
}

let channel: RealtimeChannel | null = null;

/**
 * Start listening for real-time changes on vault_items.
 */
export function startRealtimeSync(
  supabase: SupabaseClient,
  userId: string,
  onItemChange?: (change: VaultItemChange) => void
): void {
  // Clean up existing
  if (channel) {
    supabase.removeChannel(channel);
  }

  channel = supabase
    .channel(`vault:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "vault_items",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        void handleRealtimeEvent(payload, onItemChange);
      }
    )
    .subscribe((status) => {
      if (status === "CLOSED" || status === "CHANNEL_ERROR") {
        scheduleReconnect(supabase, userId, onItemChange);
      }
    });
}

/**
 * Stop real-time sync.
 */
export function stopRealtimeSync(supabase: SupabaseClient): void {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
}

async function handleRealtimeEvent(
  payload: { eventType: string; new: Record<string, unknown> | null; old: Record<string, unknown> | null },
  onItemChange?: (change: VaultItemChange) => void
): Promise<void> {
  const { eventType } = payload;
  const newRow = payload.new as Record<string, unknown> | null;
  const oldRow = payload.old as Record<string, unknown> | null;

  switch (eventType) {
    case "INSERT": {
      if (!newRow) return;
      const id = newRow.id as string;
      // Skip echoes
      if (isEcho(id, newRow.version as number)) return;

      await db.vaultItems.put({
        ...(newRow as unknown as import("./schema").LocalVaultItem),
        sync_status: "synced",
      });
      onItemChange?.({ type: "added", itemId: id });
      break;
    }

    case "UPDATE": {
      if (!newRow) return;
      const id = newRow.id as string;
      if (isEcho(id, newRow.version as number)) return;

      const localItem = await db.vaultItems.get(id);
      if (localItem?.sync_status === "pending_push") return;

      await db.vaultItems.put({
        ...(newRow as unknown as import("./schema").LocalVaultItem),
        sync_status: "synced",
      });

      // Check for soft delete
      if (newRow.deleted_at) {
        onItemChange?.({ type: "deleted", itemId: id });
      } else {
        onItemChange?.({ type: "updated", itemId: id });
      }
      break;
    }

    case "DELETE": {
      const id = (oldRow?.id ?? newRow?.id) as string | undefined;
      if (id) {
        await db.vaultItems.delete(id);
        onItemChange?.({ type: "deleted", itemId: id });
      }
      break;
    }
  }
}

function scheduleReconnect(
  supabase: SupabaseClient,
  userId: string,
  onItemChange?: (change: VaultItemChange) => void
): void {
  let delay = 1000;
  const maxDelay = 30000;

  const attempt = async (): Promise<void> => {
    try {
      await pullChanges(supabase, userId);
      startRealtimeSync(supabase, userId, onItemChange);
    } catch {
      delay = Math.min(delay * 2, maxDelay);
      setTimeout(() => void attempt(), delay);
    }
  };

  setTimeout(() => void attempt(), delay);
}
