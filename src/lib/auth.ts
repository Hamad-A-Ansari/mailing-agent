import { getCurrentUserId } from "@/lib/supabase/auth-server";

/**
 * Get the current authenticated user ID from Supabase session.
 */
export async function getAuthUserId(): Promise<string | null> {
  return getCurrentUserId();
}
