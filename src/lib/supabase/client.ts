import { createClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client.
 * Uses the public anon key (read-only access via RLS if configured).
 * For this app, most DB access happens server-side with the service role.
 */
export function createBrowserSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
  }

  // Note: For this app, we primarily use server-side Supabase client.
  // The browser client is a lightweight instance for any future client-side needs.
  return createClient(supabaseUrl, supabaseUrl);
}
