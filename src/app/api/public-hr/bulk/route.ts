import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const OWNER_USER_ID = process.env.OWNER_USER_ID;

function isOwner(userId: string): boolean {
  return !!OWNER_USER_ID && userId === OWNER_USER_ID;
}

const bulkSchema = z.object({
  entries: z.array(z.object({
    name: z.string().min(1),
    company: z.string().min(1),
    role: z.string().default("Recruiter"),
    emails: z.array(z.string()).min(1),
  })).min(1),
});

/**
 * POST /api/public-hr/bulk — Bulk upload (owner only)
 */
export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOwner(userId)) return Response.json({ error: "Owner only" }, { status: 403 });

  const body = await request.json();
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = createServerSupabaseClient();

  const rows = parsed.data.entries.map((entry) => ({
    name: entry.name,
    company: entry.company,
    role: entry.role,
    emails: entry.emails,
    added_by: userId,
  }));

  const { data, error } = await supabase
    .from("public_hr_database")
    .insert(rows)
    .select("id");

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true, inserted: data?.length || 0 });
}
