import { getAuthUserId } from "@/lib/auth";

/**
 * GET /api/me
 * Returns the current user's role.
 */
export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  return Response.json({ userId, role: "owner", isDemo: false });
}
