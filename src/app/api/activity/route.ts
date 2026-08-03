import { getAuthUserId } from "@/lib/auth";
import { isOwner } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/activity
 * Paginated activity logs. Owner only.
 */
export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

  const supabase = createServerSupabaseClient();

  const { data, error, count } = await supabase
    .from("activity_logs")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    activities: data,
    total: count ?? 0,
    page,
    pageSize,
  });
}
