import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/email-threads?recruiterId=xxx
 * Returns all emails sent to a recruiter, ordered by date (thread view).
 * 
 * GET /api/email-threads (no params)
 * Returns recent sent emails grouped by recruiter.
 */
export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const recruiterId = searchParams.get("recruiterId");

  const supabase = createServerSupabaseClient();

  if (recruiterId) {
    // Get all emails for a specific recruiter (thread view)
    const { data, error } = await supabase
      .from("email_logs")
      .select("id, to_email, subject, body, status, message_id, in_reply_to, sent_at")
      .eq("user_id", userId)
      .eq("recruiter_id", recruiterId)
      .eq("status", "sent")
      .order("sent_at", { ascending: true });

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ emails: data || [] });
  }

  // Get recent sent emails grouped by recruiter
  const { data, error } = await supabase
    .from("email_logs")
    .select(`
      id, recruiter_id, to_email, subject, body, status, message_id, sent_at,
      recruiters!inner(name, company)
    `)
    .eq("user_id", userId)
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(100);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Group by recruiter
  const grouped: Record<string, { recruiterName: string; company: string; recruiterId: string; emails: unknown[] }> = {};
  for (const row of data || []) {
    const recruiter = (Array.isArray(row.recruiters) ? row.recruiters[0] : row.recruiters) as unknown as { name: string; company: string } | null;
    const rid = row.recruiter_id;
    if (!grouped[rid]) {
      grouped[rid] = {
        recruiterId: rid,
        recruiterName: recruiter?.name || "Unknown",
        company: recruiter?.company || "",
        emails: [],
      };
    }
    grouped[rid].emails.push({
      id: row.id,
      toEmail: row.to_email,
      subject: row.subject,
      body: row.body,
      messageId: row.message_id,
      sentAt: row.sent_at,
    });
  }

  const threads = Object.values(grouped).sort((a, b) => {
    const aLatest = (a.emails[0] as { sentAt: string })?.sentAt || "";
    const bLatest = (b.emails[0] as { sentAt: string })?.sentAt || "";
    return bLatest.localeCompare(aLatest);
  });

  return Response.json({ threads });
}
