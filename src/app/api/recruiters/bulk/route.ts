import { getAuthUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import { z } from "zod";

const bulkRecruiterSchema = z.object({
  name: z.string().min(1),
  company: z.string().min(1),
  title: z.string().optional().nullable(),
  linkedin_url: z.string().optional().nullable(),
  emails: z
    .array(
      z.object({
        email: z.string().email(),
        type: z.string(),
        is_primary: z.boolean(),
      })
    )
    .min(1),
  phones: z
    .array(
      z.object({
        phone: z.string().min(1),
        label: z.string(),
        is_primary: z.boolean(),
      })
    )
    .optional()
    .default([]),
  notes: z.string().optional().nullable(),
});

const bulkImportSchema = z.object({
  recruiters: z.array(bulkRecruiterSchema),
});

/**
 * POST /api/recruiters/bulk
 * Bulk import recruiters. Owner only.
 */
export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = bulkImportSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();
  const results: { inserted: number; failed: number; errors: Array<{ row: number; message: string }> } = {
    inserted: 0,
    failed: 0,
    errors: [],
  };

  for (let i = 0; i < parsed.data.recruiters.length; i++) {
    const recruiter = parsed.data.recruiters[i];

    try {
      // Insert recruiter
      const { data: created, error: recruiterError } = await supabase
        .from("recruiters")
        .insert({
          user_id: userId,
          name: recruiter.name,
          company: recruiter.company,
          title: recruiter.title || null,
          linkedin_url: recruiter.linkedin_url || null,
          notes: recruiter.notes || null,
        })
        .select()
        .single();

      if (recruiterError) {
        results.failed++;
        results.errors.push({ row: i + 1, message: recruiterError.message });
        continue;
      }

      // Insert emails
      const emailRows = recruiter.emails.map((e) => ({
        recruiter_id: created.id,
        email: e.email,
        type: e.type,
        is_primary: e.is_primary,
      }));

      const { error: emailError } = await supabase
        .from("recruiter_emails")
        .insert(emailRows);

      if (emailError) {
        // Rollback the recruiter
        await supabase.from("recruiters").delete().eq("id", created.id);
        results.failed++;
        results.errors.push({ row: i + 1, message: emailError.message });
        continue;
      }

      // Insert phone numbers (if provided)
      if (recruiter.phones && recruiter.phones.length > 0) {
        const phoneRows = recruiter.phones.map((p) => ({
          recruiter_id: created.id,
          phone: p.phone,
          label: p.label || "mobile",
          is_primary: p.is_primary,
        }));
        await supabase.from("recruiter_phones").insert(phoneRows);
      }

      results.inserted++;
    } catch (err) {
      results.failed++;
      results.errors.push({
        row: i + 1,
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  await logActivity(userId, "bulk_import_recruiters", {
    inserted: results.inserted,
    failed: results.failed,
    totalAttempted: parsed.data.recruiters.length,
  });

  return Response.json(results, { status: 201 });
}
