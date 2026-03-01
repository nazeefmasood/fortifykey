"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { db, type LocalVaultItem } from "@fortifykey/db";
import {
  encryptPayload,
  decryptPayload,
  calculateStrength,
  normalizeDomain,
  type VaultItem,
  type VaultPayload,
  type DecryptedVaultItem,
  type ItemType,
  type EncryptedField,
} from "@fortifykey/shared";
import { useMasterKeyStore } from "../stores/master-key";
import { useSupabase } from "./useSupabase";

interface UseVaultItemsOptions {
  type?: ItemType;
  categoryId?: string;
}

/**
 * Hook for vault item CRUD.
 * Reads from local Dexie DB, writes to both Dexie and Supabase.
 * Decrypts items using the vault key from Zustand.
 */
export function useVaultItems(options?: UseVaultItemsOptions) {
  const [items, setItems] = useState<DecryptedVaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const vaultKey = useMasterKeyStore((s) => s.vaultKey);
  const resetLockTimer = useMasterKeyStore((s) => s.resetLockTimer);
  const { userId } = useAuth();
  const { getSupabase } = useSupabase();

  // Load and decrypt items from local DB
  const loadItems = useCallback(async () => {
    if (!vaultKey || !userId) {
      setItems([]);
      setLoading(false);
      return;
    }

    resetLockTimer();

    try {
      let query = db.vaultItems
        .where("user_id")
        .equals(userId);

      const rawItems = await query.toArray();

      // Filter in memory for type/category and non-deleted
      const filtered = rawItems.filter((item) => {
        if (item.deleted_at) return false;
        if (options?.type && item.item_type !== options.type) return false;
        if (options?.categoryId && item.category_id !== options.categoryId)
          return false;
        return true;
      });

      // Decrypt all items
      const decrypted = await Promise.all(
        filtered.map(async (item) => {
          try {
            const data = await decryptPayload<VaultPayload>(
              item.encrypted_data,
              vaultKey
            );
            const { encrypted_data, sync_status, ...rest } = item;
            return { ...rest, data } as DecryptedVaultItem;
          } catch {
            // If decryption fails, skip this item
            return null;
          }
        })
      );

      setItems(decrypted.filter(Boolean) as DecryptedVaultItem[]);
    } catch (err) {
      console.error("Failed to load vault items:", err);
    } finally {
      setLoading(false);
    }
  }, [vaultKey, userId, options?.type, options?.categoryId, resetLockTimer]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  // Reload items periodically to pick up sync changes
  useEffect(() => {
    const interval = setInterval(() => {
      void loadItems();
    }, 5_000);
    return () => clearInterval(interval);
  }, [loadItems]);

  // Add a new vault item
  const addItem = useCallback(
    async (
      itemType: ItemType,
      name: string,
      payload: VaultPayload,
      options?: {
        domain?: string;
        categoryId?: string;
        iconUrl?: string;
      }
    ) => {
      if (!vaultKey || !userId) throw new Error("Vault is locked");

      resetLockTimer();

      // Encrypt the payload
      const encrypted = await encryptPayload(payload, vaultKey);

      // Calculate password strength for logins
      let strength: number | null = null;
      if (itemType === "login" && "password" in payload) {
        strength = calculateStrength(
          (payload as { password: string }).password
        ).score;
      }

      const domain = options?.domain
        ? normalizeDomain(options.domain)
        : null;

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const item: LocalVaultItem = {
        id,
        user_id: userId,
        item_type: itemType,
        name,
        domain,
        category_id: options?.categoryId ?? null,
        favorite: false,
        encrypted_data: encrypted,
        icon_url: options?.iconUrl ?? null,
        password_strength: strength,
        last_used_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        version: 1,
        sync_status: "pending_push",
      };

      // Write to local DB
      await db.vaultItems.put(item);

      // Enqueue sync
      await db.syncQueue.add({
        item_id: id,
        table_name: "vault_items",
        operation: "INSERT",
        payload: JSON.stringify({
          id,
          user_id: userId,
          item_type: itemType,
          name,
          domain,
          category_id: options?.categoryId ?? null,
          favorite: false,
          encrypted_data: encrypted,
          icon_url: options?.iconUrl ?? null,
          password_strength: strength,
          last_used_at: null,
          version: 1,
        }),
        created_at: now,
        retry_count: 0,
      });

      // Try immediate push to Supabase
      try {
        const supabase = await getSupabase();
        const { error } = await supabase.from("vault_items").insert({
          id,
          user_id: userId,
          item_type: itemType,
          name,
          domain,
          category_id: options?.categoryId ?? null,
          favorite: false,
          encrypted_data: encrypted,
          icon_url: options?.iconUrl ?? null,
          password_strength: strength,
          last_used_at: null,
          version: 1,
        });

        if (!error) {
          // Remove from sync queue and mark synced
          const queueEntry = await db.syncQueue
            .where("item_id")
            .equals(id)
            .first();
          if (queueEntry?.id) await db.syncQueue.delete(queueEntry.id);
          await db.vaultItems.update(id, { sync_status: "synced" });
        }
      } catch {
        // Will be synced later by the sync worker
      }

      await loadItems();
      return id;
    },
    [vaultKey, userId, getSupabase, loadItems, resetLockTimer]
  );

  // Delete a vault item (soft delete)
  const deleteItem = useCallback(
    async (itemId: string) => {
      if (!userId) return;

      resetLockTimer();

      const now = new Date().toISOString();

      // Soft delete locally
      await db.vaultItems.update(itemId, {
        deleted_at: now,
        sync_status: "pending_push",
      });

      // Enqueue sync
      await db.syncQueue.add({
        item_id: itemId,
        table_name: "vault_items",
        operation: "DELETE",
        payload: JSON.stringify({ deleted_at: now }),
        created_at: now,
        retry_count: 0,
      });

      // Try immediate push
      try {
        const supabase = await getSupabase();
        await supabase
          .from("vault_items")
          .update({ deleted_at: now })
          .eq("id", itemId);
      } catch {
        // Will sync later
      }

      await loadItems();
    },
    [userId, getSupabase, loadItems, resetLockTimer]
  );

  return { items, loading, addItem, deleteItem, refresh: loadItems };
}
