import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const OWNER_USER_ID = process.env.OWNER_USER_ID;

function isOwner(userId: string): boolean {
  return !!OWNER_USER_ID && userId === OWNER_USER_ID;
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  company: z.string().min(1).optional(),
  role: z.string().optional(),
  emails: z.array(z.string().email()).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/public-hr/[id] — Update entry (owner only)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const userId = await getAuthUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOwner(userId)) return Response.json({ error: "Owner only" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("public_hr_database")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data);
}

/**
 * DELETE /api/public-hr/[id] — Delete entry (owner only)
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const userId = await getAuthUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOwner(userId)) return Response.json({ error: "Owner only" }, { status: 403 });

  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { error } = await supabase.from("public_hr_database").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true });
}
