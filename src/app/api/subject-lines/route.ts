import { getAuthUserId } from "@/lib/auth";
import { isOwner } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import { createSubjectLineSchema } from "@/lib/validations";

/**
 * GET /api/subject-lines
 * List all subject lines. Owner only.
 */
export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("subject_lines")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const activeCount = data?.filter((s) => s.is_active).length ?? 0;
  const totalCount = data?.length ?? 0;

  return Response.json({
    subjectLines: data,
    activeCount,
    totalCount,
  });
}

/**
 * POST /api/subject-lines
 * Add a new subject line. Owner only.
 */
export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSubjectLineSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("subject_lines")
    .insert({ user_id: userId, text: parsed.data.text })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  await logActivity(userId, "created_subject_line", {
    subjectLineId: data.id,
    text: parsed.data.text,
  });

  return Response.json(data, { status: 201 });
}
