import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const jobSchema = z.object({
  linkedin_job_id: z.string().min(1),
  job_title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().optional().nullable(),
  job_url: z.string().optional().nullable(),
});

const importSchema = z.object({
  jobs: z.array(jobSchema),
});

/**
 * POST /api/applications/import
 * Import jobs from Chrome extension. Deduplicates by linkedin_job_id.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = importSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();
  const { jobs } = parsed.data;

  // Get existing linkedin_job_ids for this user
  const linkedinIds = jobs.map((j) => j.linkedin_job_id);
  const { data: existing } = await supabase
    .from("applications")
    .select("linkedin_job_id")
    .eq("user_id", userId)
    .in("linkedin_job_id", linkedinIds);

  const existingIds = new Set((existing || []).map((e) => e.linkedin_job_id));

  // Filter to only new jobs
  const newJobs = jobs.filter((j) => !existingIds.has(j.linkedin_job_id));

  if (newJobs.length === 0) {
    return Response.json({
      imported: 0,
      skipped: jobs.length,
      total: jobs.length,
    });
  }

  // Insert new jobs
  const rows = newJobs.map((j) => ({
    user_id: userId,
    job_title: j.job_title,
    company: j.company,
    location: j.location || null,
    job_url: j.job_url || null,
    linkedin_job_id: j.linkedin_job_id,
    stage: "Saved",
    priority: "medium",
    source: "linkedin",
  }));

  const { error } = await supabase.from("applications").insert(rows);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    imported: newJobs.length,
    skipped: jobs.length - newJobs.length,
    total: jobs.length,
  });
}
