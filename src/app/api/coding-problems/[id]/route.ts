import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("coding_problems")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return Response.json({ error: "Problem not found" }, { status: 404 });
  }

  const problem = {
    id: data.id,
    leetcodeId: data.leetcode_id,
    title: data.title,
    slug: data.slug,
    difficulty: data.difficulty,
    topics: data.topics,
    description: data.description,
    examples: data.examples,
    constraints: data.constraints,
    hints: data.hints,
    codeSnippets: data.code_snippets,
    companyTags: data.company_tags,
    createdAt: data.created_at,
  };

  return Response.json(problem);
}
