import { getAuthUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import { updateTemplateSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/templates/[id]
 * Update a template. Owner only.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateTemplateSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("email_templates")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  await logActivity(userId, "updated_template", {
    templateId: id,
    fields: Object.keys(parsed.data),
  });

  return Response.json(data);
}

/**
 * DELETE /api/templates/[id]
 * Delete a template. Owner only.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data: template } = await supabase
    .from("email_templates")
    .select("name")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("email_templates")
    .delete()
    .eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  await logActivity(userId, "deleted_template", {
    templateId: id,
    name: template?.name,
  });

  return Response.json({ success: true });
}
