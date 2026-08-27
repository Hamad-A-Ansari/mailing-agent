import { getAuthUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/replies/[id]
 * Get a single thread with full conversation (all messages in same thread).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = createServerSupabaseClient();

  // Get the thread entry
  const { data: thread, error } = await supabase
    .from("email_threads")
    .select("*, recruiters(id, name, company, title)")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !thread) {
    return Response.json({ error: "Thread not found" }, { status: 404 });
  }

  // Get all messages in the same conversation thread
  let conversation: typeof thread[] = [];
  if (thread.thread_id) {
    const { data: threadMessages } = await supabase
      .from("email_threads")
      .select("*")
      .eq("user_id", userId)
      .eq("thread_id", thread.thread_id)
      .order("received_at", { ascending: true });

    conversation = threadMessages || [];
  } else {
    conversation = [thread];
  }

  // Mark as read
  if (!thread.is_read) {
    await supabase
      .from("email_threads")
      .update({ is_read: true })
      .eq("id", id);

    // Mark notification as read
    await supabase
      .from("reply_notifications")
      .update({ is_read: true })
      .eq("thread_id", id)
      .eq("user_id", userId);
  }

  return Response.json({ thread, conversation });
}
