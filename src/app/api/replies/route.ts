import { getAuthUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/replies
 * List replies/threads for the authenticated user.
 * 
 * Query params:
 * - filter: "replies" | "bounces" | "all" (default: "replies")
 * - search: search term (matches subject, from_email, body_preview)
 * - recruiter_id: filter by specific recruiter
 * - page: pagination (default: 1)
 * - limit: items per page (default: 20)
 * - unread: "true" to show only unread
 */
export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") || "replies";
  const search = searchParams.get("search") || "";
  const recruiterId = searchParams.get("recruiter_id");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
  const unreadOnly = searchParams.get("unread") === "true";

  const supabase = createServerSupabaseClient();
  const offset = (page - 1) * limit;

  // Build query
  let query = supabase
    .from("email_threads")
    .select("*, recruiters(id, name, company)", { count: "exact" })
    .eq("user_id", userId)
    .eq("direction", "received")
    .order("received_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filter
  if (filter === "replies") {
    query = query.eq("is_reply", true).eq("is_bounce", false);
  } else if (filter === "bounces") {
    query = query.eq("is_bounce", true);
  }
  // "all" = no additional filter on type

  // Apply search
  if (search) {
    query = query.or(
      `subject.ilike.%${search}%,from_email.ilike.%${search}%,body_preview.ilike.%${search}%`
    );
  }

  // Filter by recruiter
  if (recruiterId) {
    query = query.eq("recruiter_id", recruiterId);
  }

  // Unread only
  if (unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data, error, count } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Get unread count for badge
  const { count: unreadCount } = await supabase
    .from("email_threads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("direction", "received")
    .eq("is_reply", true)
    .eq("is_read", false);

  return Response.json({
    threads: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
    unreadCount: unreadCount || 0,
  });
}

/**
 * PATCH /api/replies
 * Mark threads as read/unread or starred.
 * Body: { ids: string[], action: "read" | "unread" | "star" | "unstar" }
 */
export async function PATCH(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json();
  const { ids, action } = body as { ids: string[]; action: string };

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return Response.json({ error: "ids required" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  let updateData: Record<string, boolean> = {};
  if (action === "read") updateData = { is_read: true };
  else if (action === "unread") updateData = { is_read: false };
  else if (action === "star") updateData = { starred: true };
  else if (action === "unstar") updateData = { starred: false };
  else {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }

  const { error } = await supabase
    .from("email_threads")
    .update(updateData)
    .eq("user_id", userId)
    .in("id", ids);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Also mark reply_notifications as read if marking threads as read
  if (action === "read") {
    await supabase
      .from("reply_notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .in("thread_id", ids);
  }

  return Response.json({ updated: ids.length });
}
