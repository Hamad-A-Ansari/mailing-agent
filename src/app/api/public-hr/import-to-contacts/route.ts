import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import { z } from "zod";

const importSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "Select at least one entry"),
});

/**
 * POST /api/public-hr/import-to-contacts
 * Copies selected public HR entries to the user's personal contacts.
 * Skips duplicates (same email already exists in user's contacts).
 */
export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = createServerSupabaseClient();

  // Fetch selected entries
  const { data: entries, error: fetchErr } = await supabase
    .from("public_hr_database")
    .select("*")
    .in("id", parsed.data.ids);

  if (fetchErr || !entries) return Response.json({ error: "Failed to fetch entries" }, { status: 500 });

  // Get user's existing emails for duplicate detection
  const { data: existingEmails } = await supabase
    .from("recruiter_emails")
    .select("email, recruiter_id, recruiters!inner(user_id)")
    .eq("recruiters.user_id", userId);

  const existingEmailSet = new Set(
    (existingEmails || []).map((e) => (e.email as string).toLowerCase())
  );

  let imported = 0;
  let skipped = 0;

  for (const entry of entries) {
    // Check if any of this entry's emails already exist in user's contacts
    const entryEmails = (entry.emails as string[]) || [];
    const isDuplicate = entryEmails.some((e) => existingEmailSet.has(e.toLowerCase()));

    if (isDuplicate) {
      skipped++;
      continue;
    }

    // Create recruiter in user's contacts
    const { data: recruiter, error: createErr } = await supabase
      .from("recruiters")
      .insert({
        user_id: userId,
        name: entry.name,
        company: entry.company,
        role: entry.role || "Recruiter",
        notes: `Imported from Public HR Database`,
      })
      .select("id")
      .single();

    if (createErr || !recruiter) {
      skipped++;
      continue;
    }

    // Insert emails
    const emailRows = entryEmails.map((email, i) => ({
      recruiter_id: recruiter.id,
      email,
      type: "work",
      is_primary: i === 0,
    }));

    await supabase.from("recruiter_emails").insert(emailRows);

    // Add to existing set to catch duplicates within the same batch
    entryEmails.forEach((e) => existingEmailSet.add(e.toLowerCase()));
    imported++;
  }

  await logActivity(userId, "imported_from_public_hr", { imported, skipped });

  return Response.json({ success: true, imported, skipped });
}
