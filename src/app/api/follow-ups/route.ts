import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/supabase/auth-server";
import { z } from "zod";

const createSchema = z.object({
  recruiterId: z.string().uuid(),
  email: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  scheduledAt: z.string(), // ISO date string
});

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const supabase = createServerSupabaseClient();

  let query = supabase
    .from("follow_ups")
    .select(`
      id, recruiter_id, email, subject, body, status, scheduled_at, sent_at, error_message, created_at,
      recruiters!inner(name, company)
    `)
    .eq("user_id", userId)
    .order("scheduled_at", { ascending: true });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const followUps = (data || []).map((row: Record<string, unknown>) => {
    const recruiter = row.recruiters as Record<string, unknown> | null;
    return {
      id: row.id,
      recruiterId: row.recruiter_id,
      email: row.email,
      subject: row.subject,
      body: row.body,
      status: row.status,
      scheduledAt: row.scheduled_at,
      sentAt: row.sent_at,
      errorMessage: row.error_message,
      recruiterName: recruiter?.name || "Unknown",
      company: recruiter?.company || "",
      createdAt: row.created_at,
    };
  });

  return Response.json({ followUps });
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { recruiterId, email, subject, body: emailBody, scheduledAt } = parsed.data;
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("follow_ups")
    .insert({
      user_id: userId,
      recruiter_id: recruiterId,
      email,
      subject,
      body: emailBody,
      scheduled_at: scheduledAt,
    })
    .select("id")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true, id: data.id });
}

export async function DELETE(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("follow_ups")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("status", "scheduled");

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true });
}
