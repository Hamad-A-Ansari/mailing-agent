import { auth } from "@clerk/nextjs/server";
import { getUserRole } from "@/lib/auth";

/**
 * GET /api/me
 * Returns the current user's role.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const role = getUserRole(userId);
  return Response.json({ userId, role, isDemo: role !== "owner" });
}
