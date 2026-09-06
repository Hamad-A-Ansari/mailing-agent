import { getAuthUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import { createDmTemplateSchema } from "@/lib/validations";

/**
 * GET /api/dm-templates
 * List LinkedIn DM templates with optional category filter.
 * Used by the web app and the browser extension (via credentials: include).
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
    .from("dm_templates")
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
 * POST /api/dm-templates
 * Create a new DM template.
 */
export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createDmTemplateSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("dm_templates")
    .insert({ user_id: userId, ...parsed.data })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  await logActivity(userId, "created_dm_template", {
    templateId: data.id,
    name: parsed.data.name,
    category: parsed.data.category,
  });

  return Response.json(data, { status: 201 });
}
