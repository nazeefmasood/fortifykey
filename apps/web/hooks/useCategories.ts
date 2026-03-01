"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { db, type LocalCategory } from "@fortifykey/db";
import type { Category } from "@fortifykey/shared";
import { useMasterKeyStore } from "../stores/master-key";
import { useSupabase } from "./useSupabase";

/**
 * Hook for category CRUD.
 */
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { userId } = useAuth();
  const { getSupabase } = useSupabase();
  const resetLockTimer = useMasterKeyStore((s) => s.resetLockTimer);

  const loadCategories = useCallback(async () => {
    if (!userId) {
      setCategories([]);
      setLoading(false);
      return;
    }

    try {
      const raw = await db.categories
        .where("user_id")
        .equals(userId)
        .toArray();

      setCategories(
        raw.map(({ sync_status, ...rest }) => rest as Category)
      );
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const addCategory = useCallback(
    async (name: string, icon: string = "folder", color: string | null = null) => {
      if (!userId) throw new Error("Not authenticated");

      resetLockTimer();

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const cat: LocalCategory = {
        id,
        user_id: userId,
        name,
        icon,
        color,
        sort_order: categories.length,
        created_at: now,
        sync_status: "pending_push",
      };

      await db.categories.put(cat);

      // Try pushing to Supabase
      try {
        const supabase = await getSupabase();
        const { error } = await supabase.from("categories").insert({
          id,
          user_id: userId,
          name,
          icon,
          color,
          sort_order: categories.length,
        });

        if (!error) {
          await db.categories.update(id, { sync_status: "synced" });
        }
      } catch {
        // Will sync later
      }

      await loadCategories();
      return id;
    },
    [userId, categories.length, getSupabase, loadCategories, resetLockTimer]
  );

  const deleteCategory = useCallback(
    async (categoryId: string) => {
      if (!userId) return;

      resetLockTimer();

      await db.categories.delete(categoryId);

      try {
        const supabase = await getSupabase();
        await supabase.from("categories").delete().eq("id", categoryId);
      } catch {
        // Will sync later
      }

      await loadCategories();
    },
    [userId, getSupabase, loadCategories, resetLockTimer]
  );

  return { categories, loading, addCategory, deleteCategory, refresh: loadCategories };
}
