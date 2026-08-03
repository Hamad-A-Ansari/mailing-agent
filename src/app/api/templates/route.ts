import { getAuthUserId } from "@/lib/auth";
import { isOwner } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import { createTemplateSchema } from "@/lib/validations";

/**
 * GET /api/templates
 * List templates with optional category filter. Owner only.
 */
export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  const supabase = createServerSupabaseClient();

  let query = supabase
    .from("email_templates")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ templates: data });
}

/**
 * POST /api/templates
 * Create a new template. Owner only.
 */
export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createTemplateSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("email_templates")
    .insert({ user_id: userId, ...parsed.data })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  await logActivity(userId, "created_template", {
    templateId: data.id,
    name: parsed.data.name,
    category: parsed.data.category,
  });

  return Response.json(data, { status: 201 });
}
