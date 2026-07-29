import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const createApplicationSchema = z.object({
  job_title: z.string().min(1),
  company: z.string().min(1),
  stage: z.enum(["Saved", "Applied", "OA", "Phone Screen", "Technical Interview", "Final Round", "Offer", "Rejected", "Accepted"]).default("Saved"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
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

/**
 * GET /api/applications
 * List all applications for the current user.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ applications: data });
}

/**
 * POST /api/applications
 * Create a new application.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createApplicationSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("applications")
    .insert({ user_id: userId, ...parsed.data })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}
