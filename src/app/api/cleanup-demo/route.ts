import { getAuthUserId } from "@/lib/auth";
import { isOwner } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/cleanup-demo
 * Deletes all data created by non-owner (demo) users. Owner only.
 */
export async function POST() {
  const userId = await getAuthUserId();
  if (!userId || !isOwner(userId)) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const ownerUserId = process.env.OWNER_USER_ID!;
  const supabase = createServerSupabaseClient();

  // Delete demo recruiter emails (via cascade from recruiters)
  // Delete demo recruiters
  const { count: recruitersDeleted } = await supabase
    .from("recruiters")
    .delete({ count: "exact" })
    .neq("user_id", ownerUserId);

  // Delete demo templates
  const { count: templatesDeleted } = await supabase
    .from("email_templates")
    .delete({ count: "exact" })
    .neq("user_id", ownerUserId);

  // Delete demo subject lines
  const { count: subjectLinesDeleted } = await supabase
    .from("subject_lines")
    .delete({ count: "exact" })
    .neq("user_id", ownerUserId);

  // Delete demo activity logs
  const { count: activityDeleted } = await supabase
    .from("activity_logs")
    .delete({ count: "exact" })
    .neq("user_id", ownerUserId);

  // Delete demo resumes (DB only — storage cleanup would need separate logic)
  const { count: resumesDeleted } = await supabase
    .from("resumes")
    .delete({ count: "exact" })
    .neq("user_id", ownerUserId);

  // Delete demo email logs
  const { count: emailLogsDeleted } = await supabase
    .from("email_logs")
    .delete({ count: "exact" })
    .neq("user_id", ownerUserId);

  return Response.json({
    success: true,
    deleted: {
      recruiters: recruitersDeleted ?? 0,
      templates: templatesDeleted ?? 0,
      subjectLines: subjectLinesDeleted ?? 0,
      activity: activityDeleted ?? 0,
      resumes: resumesDeleted ?? 0,
      emailLogs: emailLogsDeleted ?? 0,
    },
  });
}
