import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client for auth operations (login, signup, etc.)
 * Uses the anon key — safe to expose to the client.
 */
export function createAuthClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
