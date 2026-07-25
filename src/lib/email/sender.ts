import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Get the default resume file for email attachment.
 * Returns null if no default resume is set.
 */
export async function getDefaultResume(): Promise<{
  filename: string;
  buffer: Buffer;
} | null> {
  const supabase = createServerSupabaseClient();

  const { data: resume } = await supabase
    .from("resumes")
    .select("*")
    .eq("is_default", true)
    .single();

  if (!resume) return null;

  const { data: fileData, error } = await supabase.storage
    .from("resumes")
    .download(resume.storage_path);

  if (error || !fileData) return null;

  const buffer = Buffer.from(await fileData.arrayBuffer());
  return { filename: resume.filename, buffer };
}
