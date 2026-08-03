import { getAuthUserId } from "@/lib/auth";
import { isOwner } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import { updateSubjectLineSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/subject-lines/[id]
 * Toggle active state or edit text. Owner only.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSubjectLineSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("subject_lines")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  await logActivity(userId, "updated_subject_line", {
    subjectLineId: id,
    fields: Object.keys(parsed.data),
  });

  return Response.json(data);
}

/**
 * DELETE /api/subject-lines/[id]
 * Delete a subject line. Owner only.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data: subjectLine } = await supabase
    .from("subject_lines")
    .select("text")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("subject_lines")
    .delete()
    .eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  await logActivity(userId, "deleted_subject_line", {
    subjectLineId: id,
    text: subjectLine?.text,
  });

  return Response.json({ success: true });
}
