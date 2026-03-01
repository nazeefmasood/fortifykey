import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Create a Supabase client authenticated with a Clerk JWT.
 */
export function createClerkSupabaseClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  clerkToken: string
): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
    },
  });
}

/**
 * Create an unauthenticated Supabase client (for webhooks / server-side with service key).
 */
export function createServiceSupabaseClient(
  supabaseUrl: string,
  supabaseServiceKey: string
): SupabaseClient {
  return createClient(supabaseUrl, supabaseServiceKey);
}
