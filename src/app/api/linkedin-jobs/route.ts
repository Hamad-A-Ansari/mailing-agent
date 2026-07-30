import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/linkedin-jobs
 * List all imported LinkedIn jobs for the current user.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("linkedin_jobs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ jobs: data });
}

/**
 * DELETE /api/linkedin-jobs?id=xxx
 * Delete a LinkedIn job.
 */
export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "ID required" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("linkedin_jobs")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
