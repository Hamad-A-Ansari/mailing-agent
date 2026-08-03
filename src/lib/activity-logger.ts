import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Logs a user action to the activity_logs table.
 *
 * @param userId - The user ID performing the action
 * @param action - A short description of the action (e.g. "created_recruiter")
 * @param metadata - Optional additional data about the action
 */
export async function logActivity(
  userId: string,
  action: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase.from("activity_logs").insert({
    user_id: userId,
    action,
    metadata: metadata ?? null,
  });

  if (error) {
    // Log but don't throw — activity logging should not break the main flow
    console.error("[activity-logger] Failed to log activity:", error.message);
  }
}
