import { auth } from "@clerk/nextjs/server";
import { isOwner } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * GET /api/resumes
 * List all uploaded resumes. Owner only.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ resumes: data });
}

/**
 * POST /api/resumes
 * Upload a resume (multipart/form-data, PDF only, max 5MB). Owner only.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate MIME type
  if (file.type !== "application/pdf") {
    return Response.json(
      { error: "Only PDF files are allowed" },
      { status: 400 }
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: "File exceeds 5MB limit" },
      { status: 413 }
    );
  }

  const supabase = createServerSupabaseClient();
  const filename = file.name;
  const storagePath = `${userId}/${Date.now()}-${filename}`;

  // Upload to Supabase Storage
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("resumes")
    .upload(storagePath, fileBuffer, {
      contentType: "application/pdf",
    });

  if (uploadError) {
    return Response.json({ error: uploadError.message }, { status: 500 });
  }

  // Insert DB record
  const { data, error: dbError } = await supabase
    .from("resumes")
    .insert({
      user_id: userId,
      filename,
      storage_path: storagePath,
      file_size: file.size,
      is_default: false,
    })
    .select()
    .single();

  if (dbError) {
    // Cleanup storage on DB failure
    await supabase.storage.from("resumes").remove([storagePath]);
    return Response.json({ error: dbError.message }, { status: 500 });
  }

  await logActivity(userId, "uploaded_resume", {
    resumeId: data.id,
    filename,
    fileSize: file.size,
  });

  return Response.json(data, { status: 201 });
}
