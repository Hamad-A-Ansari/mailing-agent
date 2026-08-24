import { getAuthUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import { updateRecruiterSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/recruiters/[id]
 * Update a recruiter. All authenticated users (demo mode).
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateRecruiterSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { emails, phones, ...recruiterFields } = parsed.data;
  const supabase = createServerSupabaseClient();

  // Update recruiter fields if any provided
  if (Object.keys(recruiterFields).length > 0) {
    const { error } = await supabase
      .from("recruiters")
      .update(recruiterFields)
      .eq("id", id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

  // Update emails if provided
  if (emails) {
    // Delete existing emails and re-insert
    await supabase.from("recruiter_emails").delete().eq("recruiter_id", id);

    const emailRows = emails.map((e) => ({
      recruiter_id: id,
      email: e.email,
      type: e.type,
      is_primary: e.is_primary,
    }));

    const { error: emailError } = await supabase
      .from("recruiter_emails")
      .insert(emailRows);

    if (emailError) {
      return Response.json({ error: emailError.message }, { status: 500 });
    }
  }

  // Update phones if provided
  if (phones) {
    await supabase.from("recruiter_phones").delete().eq("recruiter_id", id);

    if (phones.length > 0) {
      const phoneRows = phones.map((p) => ({
        recruiter_id: id,
        phone: p.phone,
        label: p.label || "mobile",
        is_primary: p.is_primary,
      }));

      await supabase.from("recruiter_phones").insert(phoneRows);
    }
  }

  // Fetch updated recruiter
  const { data: updated } = await supabase
    .from("recruiters")
    .select("*, recruiter_emails(*), recruiter_phones(*)")
    .eq("id", id)
    .single();

  await logActivity(userId, "updated_recruiter", {
    recruiterId: id,
    fields: Object.keys(parsed.data),
  });

  return Response.json(updated);
}

/**
 * DELETE /api/recruiters/[id]
 * Delete a recruiter. All authenticated users (demo mode).
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerSupabaseClient();

  // Get recruiter name for logging
  const { data: recruiter } = await supabase
    .from("recruiters")
    .select("name, company")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("recruiters").delete().eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  await logActivity(userId, "deleted_recruiter", {
    recruiterId: id,
    name: recruiter?.name,
    company: recruiter?.company,
  });

  return Response.json({ success: true });
}
