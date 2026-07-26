import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/stats
 * Dashboard statistics. Scoped per user.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();

  // Total recruiters
  const { count: totalRecruiters } = await supabase
    .from("recruiters")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  // Total emails sent
  const { count: totalEmailsSent } = await supabase
    .from("email_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "sent");

  // Emails sent today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count: emailsToday } = await supabase
    .from("email_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "sent")
    .gte("sent_at", today.toISOString());

  // Emails sent this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);
  const { count: emailsThisWeek } = await supabase
    .from("email_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "sent")
    .gte("sent_at", weekAgo.toISOString());

  return Response.json({
    totalRecruiters: totalRecruiters ?? 0,
    totalEmailsSent: totalEmailsSent ?? 0,
    emailsToday: emailsToday ?? 0,
    emailsThisWeek: emailsThisWeek ?? 0,
  });
}
