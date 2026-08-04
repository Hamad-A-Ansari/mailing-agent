import { getAuthUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encryption";
import { z } from "zod";

const smtpSchema = z.object({
  email: z.string().email(),
  smtp_host: z.string().min(1),
  smtp_port: z.number().min(1).max(65535),
  smtp_password: z.string().min(1),
  provider: z.enum(["gmail", "outlook", "yahoo", "custom"]).default("gmail"),
});

/**
 * GET /api/settings/smtp
 * Get current user's SMTP config (without password).
 */
export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();

  const { data } = await supabase
    .from("user_smtp_config")
    .select("email, smtp_host, smtp_port, provider, updated_at")
    .eq("user_id", userId)
    .single();

  if (!data) {
    return Response.json({ configured: false });
  }

  return Response.json({
    configured: true,
    email: data.email,
    smtp_host: data.smtp_host,
    smtp_port: data.smtp_port,
    provider: data.provider,
    updated_at: data.updated_at,
  });
}

/**
 * POST /api/settings/smtp
 * Save or update SMTP config. Password is encrypted before storing.
 */
export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = smtpSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const { email, smtp_host, smtp_port, smtp_password, provider } = parsed.data;

  // Encrypt the password
  const encryptedPassword = encrypt(smtp_password);

  const supabase = createServerSupabaseClient();

  // Upsert (insert or update if exists)
  const { error } = await supabase
    .from("user_smtp_config")
    .upsert(
      {
        user_id: userId,
        email,
        smtp_host,
        smtp_port,
        smtp_password_encrypted: encryptedPassword,
        provider,
      },
      { onConflict: "user_id" }
    );

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}

/**
 * DELETE /api/settings/smtp
 * Remove SMTP config.
 */
export async function DELETE() {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();

  await supabase
    .from("user_smtp_config")
    .delete()
    .eq("user_id", userId);

  return Response.json({ success: true });
}
