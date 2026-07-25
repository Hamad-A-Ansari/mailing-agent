import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/health
 * Verifies database connectivity by running a simple query.
 */
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    // Simple query to verify the DB connection is alive
    const { error } = await supabase
      .from("activity_logs")
      .select("id")
      .limit(1);

    if (error) {
      return Response.json(
        { status: "error", message: error.message },
        { status: 503 }
      );
    }

    return Response.json({ status: "ok" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { status: "error", message },
      { status: 500 }
    );
  }
}
