import { getAuthUserId } from "@/lib/auth";
import { fullSync } from "@/lib/email/sync";

/**
 * POST /api/mail-sync
 * Manually trigger email sync (inbox + sent folder).
 * Owner-only endpoint.
 */
export async function POST() {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  // Owner-only
  if (process.env.OWNER_USER_ID && userId !== process.env.OWNER_USER_ID) {
    return Response.json({ error: "Only the owner can trigger sync" }, { status: 403 });
  }

  try {
    const result = await fullSync(userId);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
