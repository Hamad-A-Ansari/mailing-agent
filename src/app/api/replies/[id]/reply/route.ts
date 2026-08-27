import { getAuthUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import nodemailer from "nodemailer";
import { decrypt } from "@/lib/encryption";
import { z } from "zod";

const replySchema = z.object({
  body: z.string().min(1, "Reply body is required"),
  subject: z.string().optional(),
});

/**
 * POST /api/replies/[id]/reply
 * Send a reply to a specific thread message.
 * Maintains threading via In-Reply-To and References headers.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const { id } = await params;
  const rawBody = await request.json();
  const parsed = replySchema.safeParse(rawBody);

  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();

  // Get the original thread message we're replying to
  const { data: originalThread, error: threadError } = await supabase
    .from("email_threads")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (threadError || !originalThread) {
    return Response.json({ error: "Thread not found" }, { status: 404 });
  }

  // Get SMTP config
  const { data: config } = await supabase
    .from("user_smtp_config")
    .select("email, smtp_host, smtp_port, smtp_password_encrypted")
    .eq("user_id", userId)
    .single();

  let fromEmail: string;
  let transporter: nodemailer.Transporter;

  if (config) {
    const password = decrypt(config.smtp_password_encrypted);
    transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: false,
      auth: { user: config.email, pass: password },
    });
    fromEmail = config.email;
  } else {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    fromEmail = process.env.SMTP_USER || "";
  }

  // Build reply subject (add Re: if not already present)
  const subject =
    parsed.data.subject ||
    (originalThread.subject?.startsWith("Re:")
      ? originalThread.subject
      : `Re: ${originalThread.subject || ""}`);

  // Build References header (chain of message IDs)
  const references: string[] = [];
  if (originalThread.in_reply_to) references.push(originalThread.in_reply_to);
  if (originalThread.message_id) references.push(originalThread.message_id);

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: originalThread.from_email,
      subject,
      text: parsed.data.body,
      inReplyTo: originalThread.message_id || undefined,
      references: references.length > 0 ? references.join(" ") : undefined,
    });

    // Store the sent reply in email_threads
    const sentMessageId =
      info.messageId || `<${Date.now()}.${Math.random().toString(36)}@sent>`;

    await supabase.from("email_threads").insert({
      user_id: userId,
      message_id: sentMessageId,
      in_reply_to: originalThread.message_id,
      thread_id: originalThread.thread_id || originalThread.message_id,
      recruiter_id: originalThread.recruiter_id,
      direction: "sent",
      from_email: fromEmail,
      to_email: originalThread.from_email,
      subject,
      body_preview: parsed.data.body.slice(0, 500),
      body_html: null,
      is_reply: false,
      is_bounce: false,
      is_read: true,
      received_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      messageId: sentMessageId,
      to: originalThread.from_email,
      subject,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send reply";
    return Response.json({ error: message }, { status: 500 });
  }
}
