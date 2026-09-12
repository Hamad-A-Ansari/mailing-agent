import { getAuthUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/visitors
 * List logged landing-page visits. Owner-only.
 * Query params: page, limit, search (matches org/city/country/ip)
 */
export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  // Owner-only
  if (process.env.OWNER_USER_ID && userId !== process.env.OWNER_USER_ID) {
    return Response.json({ error: "Owner only" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const search = searchParams.get("search") || "";
  const offset = (page - 1) * limit;

  const supabase = createServerSupabaseClient();

  let query = supabase
    .from("visitor_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(
      `org.ilike.%${search}%,city.ilike.%${search}%,country.ilike.%${search}%,ip.ilike.%${search}%,isp.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Summary stats
  const { count: totalVisits } = await supabase
    .from("visitor_logs")
    .select("id", { count: "exact", head: true });

  return Response.json({
    visits: data || [],
    total: count || 0,
    totalVisits: totalVisits || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
}
