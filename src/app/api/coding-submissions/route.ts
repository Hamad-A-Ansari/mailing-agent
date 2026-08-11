import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/supabase/auth-server";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const problemId = searchParams.get("problemId");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

  const supabase = createServerSupabaseClient();

  let query = supabase
    .from("coding_submissions")
    .select(`
      id, problem_id, language, status, runtime_ms, memory_kb,
      test_cases_passed, test_cases_total, created_at,
      coding_problems!inner(title, leetcode_id, difficulty)
    `, { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (problemId) {
    query = query.eq("problem_id", problemId);
  }

  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const submissions = (data || []).map((row: Record<string, unknown>) => {
    const problem = row.coding_problems as Record<string, unknown> | null;
    return {
      id: row.id,
      problemId: row.problem_id,
      problemTitle: problem?.title || "Unknown",
      problemNumber: problem?.leetcode_id || "?",
      difficulty: problem?.difficulty || "Medium",
      language: row.language,
      status: row.status,
      runtimeMs: row.runtime_ms,
      memoryKb: row.memory_kb,
      testCasesPassed: row.test_cases_passed,
      testCasesTotal: row.test_cases_total,
      createdAt: row.created_at,
    };
  });

  return Response.json({
    submissions,
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  });
}
