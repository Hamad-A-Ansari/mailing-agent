import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/follow-ups/send
 * Processes scheduled follow-ups that are due.
 * Call this from a cron job (e.g., Vercel Cron or external scheduler).
 * 
 * Authorization: Requires CRON_SECRET header to prevent unauthorized triggers.
 */
export async function POST(request: Request) {
  // Verify cron secret
  const cronSecret = request.headers.get("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET && process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();

  // Get all scheduled follow-ups that are due
  const now = new Date().toISOString();
  const { data: dueFollowUps, error } = await supabase
    .from("follow_ups")
    .select("id, user_id, email, subject, body")
    .eq("status", "scheduled")
    .lte("scheduled_at", now)
    .limit(50);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!dueFollowUps || dueFollowUps.length === 0) {
    return Response.json({ sent: 0, message: "No follow-ups due" });
  }

  let sent = 0;
  let failed = 0;

  for (const followUp of dueFollowUps) {
    try {
      // Get user's SMTP settings
      const { data: settings } = await supabase
        .from("user_settings")
        .select("smtp_host, smtp_port, smtp_user, smtp_pass_encrypted")
        .eq("user_id", followUp.user_id)
        .maybeSingle();

      if (!settings || !settings.smtp_host) {
        // No SMTP configured — mark as failed
        await supabase
          .from("follow_ups")
          .update({ status: "failed", error_message: "No SMTP settings configured" })
          .eq("id", followUp.id);
        failed++;
        continue;
      }

      // Send the email using nodemailer
      const nodemailer = await import("nodemailer");

      // Decrypt password (simple XOR with ENCRYPTION_KEY for now)
      let smtpPass = settings.smtp_pass_encrypted;
      // If encrypted, try to decrypt (same logic as main send-emails route)
      try {
        const crypto = await import("crypto");
        const key = process.env.ENCRYPTION_KEY || "";
        if (key && smtpPass) {
          const [ivHex, encrypted] = smtpPass.split(":");
          if (ivHex && encrypted) {
            const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key, "hex"), Buffer.from(ivHex, "hex"));
            smtpPass = decipher.update(encrypted, "hex", "utf8") + decipher.final("utf8");
          }
        }
      } catch {
        // Use raw value if decryption fails
      }

      const transporter = nodemailer.createTransport({
        host: settings.smtp_host,
        port: settings.smtp_port || 587,
        secure: false,
        auth: {
          user: settings.smtp_user,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: settings.smtp_user,
        to: followUp.email,
        subject: followUp.subject,
        html: followUp.body,
      });

      // Mark as sent
      await supabase
        .from("follow_ups")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", followUp.id);

      sent++;
    } catch (err) {
      await supabase
        .from("follow_ups")
        .update({ status: "failed", error_message: String(err) })
        .eq("id", followUp.id);
      failed++;
    }
  }

  return Response.json({ sent, failed, total: dueFollowUps.length });
}
