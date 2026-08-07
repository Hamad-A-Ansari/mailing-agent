import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const difficulty = searchParams.get("difficulty");
  const topic = searchParams.get("topic");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

  const supabase = createServerSupabaseClient();

  let query = supabase
    .from("coding_problems")
    .select("id, leetcode_id, title, slug, difficulty, topics, company_tags", { count: "exact" });

  if (difficulty) {
    query = query.eq("difficulty", difficulty);
  }

  if (topic) {
    query = query.contains("topics", [topic]);
  }

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  query = query
    .order("leetcode_id", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const problems = (data || []).map((row) => ({
    id: row.id,
    leetcodeId: row.leetcode_id,
    title: row.title,
    slug: row.slug,
    difficulty: row.difficulty,
    topics: row.topics,
    companyTags: row.company_tags,
  }));

  return Response.json({
    problems,
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  });
}
