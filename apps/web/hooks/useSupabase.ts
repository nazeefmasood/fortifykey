"use client";

import { useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Hook that returns a Supabase client authenticated with the Clerk JWT.
 * The JWT is fetched using the "supabase" template configured in Clerk Dashboard.
 *
 * Usage:
 *   const { supabase, getSupabase } = useSupabase();
 *   // For one-off calls: const client = await getSupabase();
 */
export function useSupabase() {
  const { getToken } = useAuth();

  // Create a lazy-authenticated Supabase client
  const getSupabase = async (): Promise<SupabaseClient> => {
    const token = await getToken({ template: "supabase" });

    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );
  };

  return { getSupabase };
}
