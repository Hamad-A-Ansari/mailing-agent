import { getAuthUserId } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { injectVariables, templateToHtml, templateToPlainText } from "@/lib/email/template-engine";
import { getResumeById } from "@/lib/email/sender";
import nodemailer from "nodemailer";
import { z } from "zod";

const sendEmailsSchema = z.object({
  recruiterIds: z.array(z.string()).min(1).max(50),
  templateCategory: z.enum(["outreach", "follow-up", "referral"]),
  templateId: z.string().optional(), // specific template to use (overrides random rotation)
  emailTarget: z.enum(["all", "company", "personal"]).default("all"),
  resumeId: z.string().optional(),
  randomizeSubjects: z.boolean().default(true),
  subjectLineId: z.string().optional(),
});

/**
 * POST /api/send-emails/stream
 * Stream email sending progress via SSE. Owner only.
 */
export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = sendEmailsSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { recruiterIds, templateCategory, templateId, emailTarget, resumeId, randomizeSubjects, subjectLineId } = parsed.data;
  const uniqueIds = [...new Set(recruiterIds)];

  if (uniqueIds.length > 50) {
    return Response.json({ error: "Maximum 50 recruiters per batch" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  // Fetch all data upfront
  const { data: recruiters } = await supabase
    .from("recruiters")
    .select("*, recruiter_emails(*)")
    .in("id", uniqueIds);

  if (!recruiters || recruiters.length === 0) {
    return Response.json({ error: "No recruiters found" }, { status: 400 });
  }

  let templateQuery = supabase
    .from("email_templates")
    .select("*")
    .eq("category", templateCategory);
  
  // If a specific template is chosen, use only that one
  if (templateId) {
    templateQuery = templateQuery.eq("id", templateId);
  }

  const { data: templates } = await templateQuery;

  if (!templates || templates.length === 0) {
    return Response.json({ error: "No templates in this category" }, { status: 400 });
  }

  const { data: subjectLines } = await supabase
    .from("subject_lines")
    .select("*")
    .eq("is_active", true);

  if (!subjectLines || subjectLines.length === 0) {
    return Response.json({ error: "No active subject lines" }, { status: 400 });
  }

  const resume = resumeId ? await getResumeById(resumeId) : null;

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  // Template/subject rotation helpers
  const companyTemplateUsed = new Map<string, Set<string>>();
  const companySubjectUsed = new Map<string, Set<string>>();

  function pickTemplate(company: string) {
    const used = companyTemplateUsed.get(company) || new Set();
    let available = templates!.filter((t) => !used.has(t.id));
    if (available.length === 0) available = templates!;
    const picked = available[Math.floor(Math.random() * available.length)];
    used.add(picked.id);
    companyTemplateUsed.set(company, used);
    return picked;
  }

  function pickSubject(company: string) {
    const used = companySubjectUsed.get(company) || new Set();
    let available = subjectLines!.filter((s) => !used.has(s.id));
    if (available.length === 0) available = subjectLines!;
    const picked = available[Math.floor(Math.random() * available.length)];
    used.add(picked.id);
    companySubjectUsed.set(company, used);
    return picked;
  }

  // Stream response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: "start", total: recruiters.length });

      let totalSent = 0;
      let totalFailed = 0;

      for (let i = 0; i < recruiters.length; i++) {
        const recruiter = recruiters[i];
        const allEmails = recruiter.recruiter_emails || [];

        // Determine target emails
        let targetEmails: string[] = [];
        if (emailTarget === "company") {
          targetEmails = allEmails.filter((e: { type: string }) => e.type === "work").map((e: { email: string }) => e.email);
        } else if (emailTarget === "personal") {
          targetEmails = allEmails.filter((e: { type: string }) => e.type === "personal").map((e: { email: string }) => e.email);
        } else {
          targetEmails = allEmails.map((e: { email: string }) => e.email);
        }
        if (targetEmails.length === 0) {
          const fallback = allEmails.find((e: { is_primary: boolean }) => e.is_primary)?.email || allEmails[0]?.email;
          if (fallback) targetEmails = [fallback];
        }

        if (targetEmails.length === 0) {
          totalFailed++;
          send({ type: "progress", index: i, recruiterId: recruiter.id, recruiterName: recruiter.name, email: "", status: "failed", error: "No email address" });
          continue;
        }

        const template = pickTemplate(recruiter.company);
        const subjectLine = randomizeSubjects
          ? pickSubject(recruiter.company)
          : subjectLines!.find((s) => s.id === subjectLineId) || pickSubject(recruiter.company);

        // Send a separate email to each target address
        for (const emailAddr of targetEmails) {
          const variableData: Record<string, string> = {
            "recruiter.firstname": recruiter.name.trim().split(/\s+/)[0] || recruiter.name,
            "recruiter.name": recruiter.name.trim().split(/\s+/)[0] || recruiter.name,
            "recruiter.company": recruiter.company,
            "recruiter.title": recruiter.title || "",
            "recruiter.email": emailAddr,
          };

          const emailBody = injectVariables(template.body, variableData).replace(/\n{3,}/g, "\n\n");
          const subject = injectVariables(subjectLine.text, variableData);

          try {
            const mailOptions: nodemailer.SendMailOptions = {
              from: process.env.SMTP_USER,
              to: emailAddr,
              subject,
              text: templateToPlainText(emailBody),
              html: templateToHtml(emailBody),
            };

            if (resume) {
              mailOptions.attachments = [{ filename: resume.filename, content: resume.buffer }];
            }

            const sendResult = await transporter.sendMail(mailOptions);
            const messageId = sendResult.messageId || null;

            await supabase.from("email_logs").insert({
              user_id: userId, recruiter_id: recruiter.id, template_id: template.id,
              subject_line_id: subjectLine.id, to_email: emailAddr, subject, body: emailBody, status: "sent",
              message_id: messageId,
            });

            totalSent++;
            send({ type: "progress", index: i, recruiterId: recruiter.id, recruiterName: recruiter.name, email: emailAddr, templateUsed: template.name, subjectUsed: subject, status: "sent" });
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Send failed";

            await supabase.from("email_logs").insert({
              user_id: userId, recruiter_id: recruiter.id, template_id: template.id,
              subject_line_id: subjectLine.id, to_email: emailAddr, subject, body: emailBody, status: "failed", error_message: errorMessage,
            });

            totalFailed++;
            send({ type: "progress", index: i, recruiterId: recruiter.id, recruiterName: recruiter.name, email: emailAddr, templateUsed: template.name, subjectUsed: subject, status: "failed", error: errorMessage });
          }

          // Delay between each individual email
          const delay = 3000 + Math.random() * 3000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        // Update recruiter status
        await supabase.from("recruiters").update({ status: "Mailed" }).eq("id", recruiter.id);
        await supabase.from("subject_lines").update({ usage_count: subjectLine.usage_count + 1 }).eq("id", subjectLine.id);
      }

      await logActivity(userId, "sent_bulk_emails", { totalSent, totalFailed, category: templateCategory, recipientCount: recruiters.length });

      send({ type: "done", totalSent, totalFailed });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
