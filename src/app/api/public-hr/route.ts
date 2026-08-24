import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const OWNER_USER_ID = process.env.OWNER_USER_ID;

function isOwner(userId: string): boolean {
  return !!OWNER_USER_ID && userId === OWNER_USER_ID;
}

const createSchema = z.object({
  name: z.string().min(1),
  company: z.string().min(1),
  role: z.string().default("Recruiter"),
  emails: z.array(z.string().email()).min(1, "At least one email required"),
});

/**
 * GET /api/public-hr — List all public HR entries (all authenticated users)
 */
export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const company = searchParams.get("company");
  const role = searchParams.get("role");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "30", 10);

  const supabase = createServerSupabaseClient();

  let query = supabase
    .from("public_hr_database")
    .select("*", { count: "exact" });

  if (search) {
    query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%`);
  }
  if (company) {
    query = query.eq("company", company);
  }
  if (role) {
    query = query.eq("role", role);
  }

  query = query
    .order("company", { ascending: true })
    .order("name", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Get list of companies for filter dropdown
  const { data: companies } = await supabase
    .from("public_hr_database")
    .select("company")
    .order("company");

  const uniqueCompanies = [...new Set((companies || []).map((c) => c.company))];

  return Response.json({
    entries: data || [],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
    companies: uniqueCompanies,
    isOwner: isOwner(userId),
  });
}

/**
 * POST /api/public-hr — Create entry (owner only)
 */
export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOwner(userId)) return Response.json({ error: "Owner only" }, { status: 403 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("public_hr_database")
    .insert({
      name: parsed.data.name,
      company: parsed.data.company,
      role: parsed.data.role,
      emails: parsed.data.emails,
      added_by: userId,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data, { status: 201 });
}
