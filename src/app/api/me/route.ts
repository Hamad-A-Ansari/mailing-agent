import { getAuthUserId, getUserRole } from "@/lib/auth";

/**
 * GET /api/me
 * Returns the current user's role.
 */
export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const role = getUserRole(userId);
  return Response.json({ userId, role, isDemo: role !== "owner" });
}
