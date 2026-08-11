import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/supabase/auth-server";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();

  // Get all problems with their topics
  const { data: allProblems } = await supabase
    .from("coding_problems")
    .select("id, topics, difficulty");

  // Get user's accepted problem IDs
  const { data: submissions } = await supabase
    .from("coding_submissions")
    .select("problem_id")
    .eq("user_id", userId)
    .eq("status", "accepted");

  const solvedIds = new Set((submissions || []).map((s) => s.problem_id));
  const problems = allProblems || [];

  // Build topic breakdown
  const topicMap = new Map<string, {
    total: number; solved: number;
    easy: number; easySolved: number;
    medium: number; mediumSolved: number;
    hard: number; hardSolved: number;
  }>();

  for (const problem of problems) {
    const solved = solvedIds.has(problem.id);
    const topics = (problem.topics as string[]) || [];
    const diff = problem.difficulty as string;

    for (const topic of topics) {
      if (!topicMap.has(topic)) {
        topicMap.set(topic, { total: 0, solved: 0, easy: 0, easySolved: 0, medium: 0, mediumSolved: 0, hard: 0, hardSolved: 0 });
      }
      const t = topicMap.get(topic)!;
      t.total++;
      if (solved) t.solved++;
      if (diff === "Easy") { t.easy++; if (solved) t.easySolved++; }
      if (diff === "Medium") { t.medium++; if (solved) t.mediumSolved++; }
      if (diff === "Hard") { t.hard++; if (solved) t.hardSolved++; }
    }
  }

  // Sort by total count descending, take top 20 topics
  const topics = Array.from(topicMap.entries())
    .map(([topic, stats]) => ({ topic, ...stats }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);

  const overall = {
    total: problems.length,
    solved: problems.filter((p) => solvedIds.has(p.id)).length,
  };

  return Response.json({ topics, overall });
}
