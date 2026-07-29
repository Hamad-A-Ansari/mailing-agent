import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateApplicationSchema = z.object({
  job_title: z.string().min(1).optional(),
  company: z.string().min(1).optional(),
  stage: z.enum(["Saved", "Applied", "OA", "Phone Screen", "Technical Interview", "Final Round", "Offer", "Rejected", "Accepted"]).optional(),
  job_url: z.string().optional().nullable(),
  job_description: z.string().optional().nullable(),
  resume_id: z.string().optional().nullable(),
  contact_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  applied_at: z.string().optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/applications/[id]
 * Update an application (stage change, notes, etc.)
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const { userId } = await auth();
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

  return Response.json(data);
}

/**
 * DELETE /api/applications/[id]
 * Delete an application.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { userId } = await auth();
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
