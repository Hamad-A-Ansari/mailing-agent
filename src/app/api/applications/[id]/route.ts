import { getAuthUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateApplicationSchema = z.object({
  job_title: z.string().min(1).optional(),
  company: z.string().min(1).optional(),
  stage: z.enum(["Saved", "Applied", "OA", "Phone Screen", "Technical Interview", "Final Round", "Offer", "Rejected", "Accepted"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  sub_stage: z.string().optional().nullable(),
  salary_range: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  meet_link: z.string().optional().nullable(),
  interviewer_name: z.string().optional().nullable(),
  job_url: z.string().optional().nullable(),
  job_description: z.string().optional().nullable(),
  resume_id: z.string().optional().nullable(),
  contact_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  interview_date: z.string().optional().nullable(),
  applied_at: z.string().optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/applications/[id]
 * Get single application with history.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data: application, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !application) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch history
  const { data: history } = await supabase
    .from("application_history")
    .select("*")
    .eq("application_id", id)
    .order("created_at", { ascending: false });

  return Response.json({ application, history: history || [] });
}

/**
 * PUT /api/applications/[id]
 * Update an application. Logs stage changes to history.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateApplicationSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Validation failed" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  // Get current application to detect stage change
  const { data: current } = await supabase
    .from("applications")
    .select("stage")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  // Update the application
  const { data, error } = await supabase
    .from("applications")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Log stage change to history
  if (parsed.data.stage && current && parsed.data.stage !== current.stage) {
    await supabase.from("application_history").insert({
      application_id: id,
      user_id: userId,
      action: "stage_changed",
      from_stage: current.stage,
      to_stage: parsed.data.stage,
    });
  }

  return Response.json(data);
}

/**
 * DELETE /api/applications/[id]
 * Delete an application.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
