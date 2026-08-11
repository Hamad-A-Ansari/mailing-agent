import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/supabase/auth-server";

/**
 * GET /api/coding-problems/list?ids=1,2,3,...
 * Returns problems by leetcode_id with solved status for current user.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids");

  if (!idsParam) {
    return Response.json({ error: "ids parameter required" }, { status: 400 });
  }

  const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);
  const userId = await getCurrentUserId();
  const supabase = createServerSupabaseClient();

  // Fetch problems by leetcode_id
  const { data: problems, error } = await supabase
    .from("coding_problems")
    .select("id, leetcode_id, title, difficulty, topics")
    .in("leetcode_id", ids)
    .order("leetcode_id", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Get user's accepted submissions to mark solved
  let solvedProblemIds: Set<string> = new Set();
  if (userId) {
    const { data: submissions } = await supabase
      .from("coding_submissions")
      .select("problem_id")
      .eq("user_id", userId)
      .eq("status", "accepted");

    if (submissions) {
      solvedProblemIds = new Set(submissions.map((s) => s.problem_id));
    }
  }

  const result = (problems || []).map((p) => ({
    id: p.id,
    leetcodeId: p.leetcode_id,
    title: p.title,
    difficulty: p.difficulty,
    topics: p.topics || [],
    solved: solvedProblemIds.has(p.id),
  }));

  return Response.json({ problems: result });
}
