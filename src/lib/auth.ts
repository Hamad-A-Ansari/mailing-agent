/**
 * Authentication and role utilities.
 *
 * Owner is identified by matching Clerk user ID against
 * the OWNER_USER_ID environment variable.
 */

export type UserRole = "owner" | "viewer";

/**
 * Returns true if the given userId matches the configured owner.
 */
export function isOwner(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return userId === process.env.OWNER_USER_ID;
}

/**
 * Returns true if the user is in demo mode (authenticated but not owner).
 */
export function isDemoUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return !isOwner(userId);
}

/**
 * Returns the role for the given userId.
 */
export function getUserRole(userId: string | null | undefined): UserRole {
  return isOwner(userId) ? "owner" : "viewer";
}

/**
 * Throws a Response with 403 status if the userId is not the owner.
 * Use in API route handlers to guard mutation endpoints.
 */
export function requireOwner(userId: string | null | undefined): void {
  if (!isOwner(userId)) {
    throw new Response(JSON.stringify({ error: "Not authorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
}
