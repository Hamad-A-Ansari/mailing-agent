import { createServerSupabaseClient } from "@/lib/supabase/server";
import { syncInbox } from "@/lib/email/sync";

/**
 * GET /api/cron/check-replies
 * Vercel Cron job — runs every 5 minutes.
 * Syncs inbox for all users with SMTP configured.
 * 
 * Authorization: CRON_SECRET header or Vercel's built-in cron auth.
 */
export async function GET(request: Request) {
  // Verify cron secret (Vercel sends Authorization: Bearer <CRON_SECRET>)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const token = authHeader?.replace("Bearer ", "");
    if (token !== cronSecret) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createServerSupabaseClient();

  // Get all users who have SMTP configured (they can receive replies)
  const { data: users } = await supabase
    .from("user_smtp_config")
    .select("user_id");

  if (!users || users.length === 0) {
    // Fallback: if owner env is set, sync for owner using env credentials
    const ownerId = process.env.OWNER_USER_ID;
    if (ownerId) {
      try {
        const result = await syncInbox(ownerId);
        return Response.json({ users: 1, results: [{ userId: ownerId, ...result }] });
      } catch (err) {
        return Response.json({
          users: 1,
          results: [{ userId: ownerId, error: String(err) }],
        });
      }
    }
    return Response.json({ users: 0, message: "No users with SMTP config" });
  }

  const results = [];

  for (const user of users) {
    try {
      const result = await syncInbox(user.user_id);
      results.push({ userId: user.user_id, ...result });
    } catch (err) {
      results.push({
        userId: user.user_id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return Response.json({
    users: users.length,
    results,
    syncedAt: new Date().toISOString(),
  });
}

// Vercel cron config
export const maxDuration = 60; // Allow up to 60s for IMAP operations
