import { getAuthUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/resumes/[id]
 * Set a resume as the default. Owner only.
 */
export async function PUT(_request: Request, { params }: RouteParams) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerSupabaseClient();

  // Unset all defaults first
  await supabase
    .from("resumes")
    .update({ is_default: false })
    .eq("is_default", true);

  // Set the target as default
  const { data, error } = await supabase
    .from("resumes")
    .update({ is_default: true })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  await logActivity(userId, "set_default_resume", {
    resumeId: id,
    filename: data.filename,
  });

  return Response.json(data);
}

/**
 * DELETE /api/resumes/[id]
 * Delete a resume from DB and Storage. Owner only.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerSupabaseClient();

  // Get storage path before deleting DB record
  const { data: resume } = await supabase
    .from("resumes")
    .select("storage_path, filename")
    .eq("id", id)
    .single();

  if (!resume) {
    return Response.json({ error: "Resume not found" }, { status: 404 });
  }

  // Delete from Storage
  const { error: storageError } = await supabase.storage
    .from("resumes")
    .remove([resume.storage_path]);

  if (storageError) {
    console.error("[resumes] Storage delete failed:", storageError.message);
  }

  // Delete from DB
  const { error: dbError } = await supabase
    .from("resumes")
    .delete()
    .eq("id", id);

  if (dbError) {
    return Response.json({ error: dbError.message }, { status: 500 });
  }

  await logActivity(userId, "deleted_resume", {
    resumeId: id,
    filename: resume.filename,
  });

  return Response.json({ success: true });
}
