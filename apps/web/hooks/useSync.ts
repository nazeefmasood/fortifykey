"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  initialSync,
  pushChanges,
  pullChanges,
  startRealtimeSync,
  stopRealtimeSync,
  db,
} from "@fortifykey/db";
import { useMasterKeyStore } from "../stores/master-key";
import { useSupabase } from "./useSupabase";

/**
 * Hook that manages vault synchronization:
 * 1. Initial sync on first mount (download entire vault)
 * 2. Realtime subscription for cross-device changes
 * 3. Periodic push of local changes
 */
export function useSync() {
  const { userId } = useAuth();
  const { getSupabase } = useSupabase();
  const isUnlocked = useMasterKeyStore((s) => s.isUnlocked);
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!userId || !isUnlocked || syncedRef.current) return;

    let supabaseClient: Awaited<ReturnType<typeof getSupabase>> | null = null;
    let pushInterval: ReturnType<typeof setInterval> | null = null;

    async function startSync() {
      try {
        supabaseClient = await getSupabase();

        // Check if we have local data already
        const localCount = await db.vaultItems.count();

        if (localCount === 0) {
          // First time on this device — download everything
          await initialSync(supabaseClient, userId!);
        } else {
          // Pull any missed changes
          await pullChanges(supabaseClient, userId!);
        }

        // Push any pending local changes
        await pushChanges(supabaseClient);

        // Start realtime subscription
        startRealtimeSync(supabaseClient, userId!);

        // Periodic push every 30 seconds
        pushInterval = setInterval(async () => {
          try {
            const client = await getSupabase();
            await pushChanges(client);
          } catch {
            // Silently fail, will retry next interval
          }
        }, 30_000);

        syncedRef.current = true;
      } catch (err) {
        console.error("Sync initialization failed:", err);
      }
    }

    void startSync();

    return () => {
      if (supabaseClient) {
        stopRealtimeSync(supabaseClient);
      }
      if (pushInterval) {
        clearInterval(pushInterval);
      }
    };
  }, [userId, isUnlocked, getSupabase]);

  // Reset sync state when vault locks
  useEffect(() => {
    if (!isUnlocked) {
      syncedRef.current = false;
    }
  }, [isUnlocked]);
}
