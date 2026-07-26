import { auth } from "@clerk/nextjs/server";
import { isOwner } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import { createRecruiterSchema } from "@/lib/validations";

/**
 * GET /api/recruiters
 * List recruiters with optional filters. Accessible to ALL authenticated users.
 */
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const company = searchParams.get("company");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const cursor = searchParams.get("cursor"); // cursor-based: created_at of last item
  const cursorId = searchParams.get("cursorId"); // tie-breaker
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

  const supabase = createServerSupabaseClient();

  let query = supabase
    .from("recruiters")
    .select("*, recruiter_emails(*)", { count: "exact" })
    .eq("user_id", userId);

  if (company) {
    query = query.eq("company", company);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (search) {
    query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%`);
  }

  // Cursor-based pagination (preferred)
  if (cursor && cursorId) {
    query = query.or(`created_at.lt.${cursor},and(created_at.eq.${cursor},id.lt.${cursorId})`);
  }

  query = query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize);

  // Fallback: offset-based if no cursor provided and page > 1
  if (!cursor && page > 1) {
    query = supabase
      .from("recruiters")
      .select("*, recruiter_emails(*)", { count: "exact" });

    if (company) query = query.eq("company", company);
    if (status) query = query.eq("status", status);
    if (search) query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%`);

    query = query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    recruiters: data,
    total: count ?? 0,
    page,
    pageSize,
    nextCursor: data && data.length === pageSize ? data[data.length - 1].created_at : null,
    nextCursorId: data && data.length === pageSize ? data[data.length - 1].id : null,
  });
}

/**
 * POST /api/recruiters
 * Create a new recruiter. All authenticated users (demo mode).
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createRecruiterSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, company, title, notes, emails } = parsed.data;
  const supabase = createServerSupabaseClient();

  // Insert recruiter
  const { data: recruiter, error: recruiterError } = await supabase
    .from("recruiters")
    .insert({ user_id: userId, name, company, title, notes })
    .select()
    .single();

  if (recruiterError) {
    return Response.json({ error: recruiterError.message }, { status: 500 });
  }

  // Insert emails
  const emailRows = emails.map((e) => ({
    recruiter_id: recruiter.id,
    email: e.email,
    type: e.type,
    is_primary: e.is_primary,
  }));

  const { error: emailError } = await supabase
    .from("recruiter_emails")
    .insert(emailRows);

  if (emailError) {
    // Rollback recruiter if email insert fails
    await supabase.from("recruiters").delete().eq("id", recruiter.id);
    return Response.json({ error: emailError.message }, { status: 500 });
  }

  // Fetch complete recruiter with emails
  const { data: complete } = await supabase
    .from("recruiters")
    .select("*, recruiter_emails(*)")
    .eq("id", recruiter.id)
    .single();

  await logActivity(userId, "created_recruiter", {
    recruiterId: recruiter.id,
    name,
    company,
  });

  return Response.json(complete, { status: 201 });
}
