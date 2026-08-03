import { getAuthUserId, isOwner } from "@/lib/auth";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { injectVariables, sampleData } from "@/lib/email/template-engine";
import { getDefaultResume } from "@/lib/email/sender";
import nodemailer from "nodemailer";
import { z } from "zod";

const testEmailSchema = z.object({
  templateCategory: z.enum(["outreach", "follow-up", "referral"]),
});

/**
 * POST /api/send-emails/test
 * Send a test email to the authenticated user's own email. Owner only.
 */
export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId || !isOwner(userId)) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const user = await createAuthServerClient().then(s => s.auth.getUser());
  const recipientEmail = user.data.user?.email;

  if (!recipientEmail) {
    return Response.json({ error: "No email found for current user" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = testEmailSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();

  // Get a random template from category
  const { data: templates } = await supabase
    .from("email_templates")
    .select("*")
    .eq("category", parsed.data.templateCategory);

  if (!templates || templates.length === 0) {
    return Response.json(
      { error: "No templates found in this category" },
      { status: 400 }
    );
  }

  // Get a random active subject line
  const { data: subjectLines } = await supabase
    .from("subject_lines")
    .select("*")
    .eq("is_active", true);

  if (!subjectLines || subjectLines.length === 0) {
    return Response.json(
      { error: "No active subject lines found" },
      { status: 400 }
    );
  }

  const template = templates[Math.floor(Math.random() * templates.length)];
  const subjectLine = subjectLines[Math.floor(Math.random() * subjectLines.length)];

  const emailBody = injectVariables(template.body, sampleData);
  const subject = injectVariables(subjectLine.text, sampleData);

  const resume = await getDefaultResume();

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const mailOptions: nodemailer.SendMailOptions = {
      from: process.env.SMTP_USER,
      to: recipientEmail,
      subject: `[TEST] ${subject}`,
      text: emailBody,
    };

    if (resume) {
      mailOptions.attachments = [
        { filename: resume.filename, content: resume.buffer },
      ];
    }

    await transporter.sendMail(mailOptions);

    return Response.json({
      success: true,
      sentTo: recipientEmail,
      templateUsed: template.name,
      subjectUsed: subject,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send test email";
    return Response.json({ error: message }, { status: 500 });
  }
}
