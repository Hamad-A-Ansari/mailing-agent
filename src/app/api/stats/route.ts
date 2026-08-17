import { getAuthUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/stats
 * Dashboard statistics with chart data. Scoped per user.
 */
export async function GET() {
  const userId = await getAuthUserId();
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

  // Total applications
  const { count: totalApplications } = await supabase
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  // Total interviews taken
  const { count: totalInterviews } = await supabase
    .from("interviews")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  // --- Chart Data: Emails per day (last 14 days) ---
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  twoWeeksAgo.setHours(0, 0, 0, 0);

  const { data: emailLogs } = await supabase
    .from("email_logs")
    .select("sent_at")
    .eq("user_id", userId)
    .eq("status", "sent")
    .gte("sent_at", twoWeeksAgo.toISOString())
    .order("sent_at", { ascending: true });

  // Group by day
  const emailsByDay: Record<string, number> = {};
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const key = d.toISOString().split("T")[0];
    emailsByDay[key] = 0;
  }
  for (const log of emailLogs || []) {
    const key = new Date(log.sent_at).toISOString().split("T")[0];
    if (emailsByDay[key] !== undefined) emailsByDay[key]++;
  }
  const emailChart = Object.entries(emailsByDay).map(([date, count]) => ({
    date,
    emails: count,
  }));

  // --- Application stage distribution ---
  const { data: applications } = await supabase
    .from("applications")
    .select("stage")
    .eq("user_id", userId);

  const stageCounts: Record<string, number> = {};
  for (const app of applications || []) {
    stageCounts[app.stage] = (stageCounts[app.stage] || 0) + 1;
  }
  const stageChart = Object.entries(stageCounts).map(([stage, count]) => ({
    stage,
    count,
  }));

  // --- Recent Activity (last 10, cleaned up) ---
  const { data: recentActivity } = await supabase
    .from("activity_log")
    .select("id, action, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  return Response.json({
    totalRecruiters: totalRecruiters ?? 0,
    totalEmailsSent: totalEmailsSent ?? 0,
    emailsToday: emailsToday ?? 0,
    emailsThisWeek: emailsThisWeek ?? 0,
    totalApplications: totalApplications ?? 0,
    totalInterviews: totalInterviews ?? 0,
    emailChart,
    stageChart,
    recentActivity: recentActivity || [],
  });
}
