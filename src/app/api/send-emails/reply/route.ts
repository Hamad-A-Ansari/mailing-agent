import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import nodemailer from "nodemailer";
import { z } from "zod";

const replySchema = z.object({
  emailLogId: z.string().uuid(), // the original email to reply to
  body: z.string().min(1),
  subject: z.string().optional(), // custom subject (defaults to Re: original)
  attachResumeId: z.string().optional(),
});

/**
 * POST /api/send-emails/reply
 * Send a follow-up reply that threads with the original email.
 */
export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = replySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const { emailLogId, body, subject: customSubject, attachResumeId } = parsed.data;
  const supabase = createServerSupabaseClient();

  // Get the original email
  const { data: originalEmail, error: fetchErr } = await supabase
    .from("email_logs")
    .select("*")
    .eq("id", emailLogId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchErr || !originalEmail) {
    return Response.json({ error: "Original email not found" }, { status: 404 });
  }

  // Build the reply subject
  const replySubject = customSubject
    ? customSubject
    : originalEmail.subject.startsWith("Re:")
      ? originalEmail.subject
      : `Re: ${originalEmail.subject}`;

  // Get user SMTP settings
  const { data: settings } = await supabase
    .from("user_settings")
    .select("smtp_host, smtp_port, smtp_user, smtp_pass_encrypted")
    .eq("user_id", userId)
    .maybeSingle();

  // Determine SMTP config (user settings or env fallback)
  let smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  let smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
  let smtpUser = process.env.SMTP_USER || "";
  let smtpPass = process.env.SMTP_PASS || "";

  if (settings?.smtp_host) {
    smtpHost = settings.smtp_host;
    smtpPort = settings.smtp_port || 587;
    smtpUser = settings.smtp_user || smtpUser;
    // Decrypt password
    if (settings.smtp_pass_encrypted) {
      try {
        const crypto = await import("crypto");
        const key = process.env.ENCRYPTION_KEY || "";
        if (key) {
          const [ivHex, encrypted] = settings.smtp_pass_encrypted.split(":");
          if (ivHex && encrypted) {
            const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key, "hex"), Buffer.from(ivHex, "hex"));
            smtpPass = decipher.update(encrypted, "hex", "utf8") + decipher.final("utf8");
          }
        }
      } catch {
        // Use env fallback
      }
    }
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: false,
    auth: { user: smtpUser, pass: smtpPass },
  });

  try {
    // Fetch the full email thread for this recruiter (all sent emails, chronological)
    const { data: threadEmails } = await supabase
      .from("email_logs")
      .select("body, sent_at, to_email")
      .eq("user_id", userId)
      .eq("recruiter_id", originalEmail.recruiter_id)
      .eq("status", "sent")
      .lte("sent_at", originalEmail.sent_at) // Only emails up to and including the one we're replying to
      .order("sent_at", { ascending: false });

    // Build the full quoted thread (newest first, each quoted with ">")
    let quotedThread = "";
    let htmlQuotedThread = "";

    for (const email of threadEmails || []) {
      const emailDate = new Date(email.sent_at).toLocaleString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      quotedThread += `\n\nOn ${emailDate}, ${smtpUser} <${smtpUser}> wrote:\n> ${email.body.split("\n").join("\n> ")}`;

      htmlQuotedThread += `
        <div class="gmail_quote" style="margin:12px 0 0 .8ex;border-left:1px solid #ccc;padding-left:1ex;">
          <p style="color:#888;font-size:12px;margin:0 0 8px;">On ${emailDate}, ${smtpUser} &lt;${smtpUser}&gt; wrote:</p>
          <blockquote style="margin:0;padding:0;color:#555;">
            ${email.body.replace(/\n/g, "<br>")}
          </blockquote>
        </div>
      `;
    }

    const fullBody = body + quotedThread;

    const htmlBody = `
      <div style="font-family:sans-serif;font-size:14px;">${body.replace(/\n/g, "<br>")}</div>
      ${htmlQuotedThread}
    `;

    const mailOptions: nodemailer.SendMailOptions = {
      from: smtpUser,
      to: originalEmail.to_email,
      subject: replySubject,
      text: fullBody,
      html: htmlBody,
      headers: {},
    };

    // Thread headers — this makes it appear in the same conversation
    if (originalEmail.message_id) {
      mailOptions.inReplyTo = originalEmail.message_id;
      mailOptions.references = originalEmail.message_id;
    }

    // Attach resume if requested
    if (attachResumeId) {
      const { getResumeById } = await import("@/lib/email/sender");
      const resume = await getResumeById(attachResumeId);
      if (resume) {
        mailOptions.attachments = [{ filename: resume.filename, content: resume.buffer }];
      }
    }

    const sendResult = await transporter.sendMail(mailOptions);

    // Log the follow-up
    await supabase.from("email_logs").insert({
      user_id: userId,
      recruiter_id: originalEmail.recruiter_id,
      to_email: originalEmail.to_email,
      subject: replySubject,
      body,
      status: "sent",
      message_id: sendResult.messageId || null,
      in_reply_to: originalEmail.message_id || originalEmail.id,
    });

    await logActivity(userId, "sent_follow_up", {
      to: originalEmail.to_email,
      recruiter_id: originalEmail.recruiter_id,
    });

    return Response.json({ success: true, messageId: sendResult.messageId });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Send failed";

    await supabase.from("email_logs").insert({
      user_id: userId,
      recruiter_id: originalEmail.recruiter_id,
      to_email: originalEmail.to_email,
      subject: replySubject,
      body,
      status: "failed",
      error_message: errorMessage,
      in_reply_to: originalEmail.message_id || originalEmail.id,
    });

    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
