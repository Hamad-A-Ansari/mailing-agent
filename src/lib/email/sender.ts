import nodemailer from "nodemailer";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { injectVariables } from "./template-engine";
import type { EmailTemplate, SubjectLine } from "@/types/database";

/**
 * Create SMTP transporter using Gmail app password.
 */
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Get the default resume file for email attachment.
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

/**
 * Pick templates with rotation per company.
 * Recruiters at the same company get different templates when pool allows.
 */
function pickTemplates(
  recruiters: Array<{ id: string; company: string }>,
  templates: EmailTemplate[]
): Map<string, EmailTemplate> {
  const assignments = new Map<string, EmailTemplate>();
  const companyUsed = new Map<string, Set<string>>();

  for (const recruiter of recruiters) {
    const used = companyUsed.get(recruiter.company) || new Set();
    let available = templates.filter((t) => !used.has(t.id));
    if (available.length === 0) available = templates;

    const picked = available[Math.floor(Math.random() * available.length)];
    assignments.set(recruiter.id, picked);
    used.add(picked.id);
    companyUsed.set(recruiter.company, used);
  }
  return assignments;
}

/**
 * Pick subject lines with rotation per company.
 */
function pickSubjectLines(
  recruiters: Array<{ id: string; company: string }>,
  activeSubjectLines: SubjectLine[]
): Map<string, SubjectLine> {
  const assignments = new Map<string, SubjectLine>();
  const companyUsed = new Map<string, Set<string>>();

  for (const recruiter of recruiters) {
    const used = companyUsed.get(recruiter.company) || new Set();
    let available = activeSubjectLines.filter((s) => !used.has(s.id));
    if (available.length === 0) available = activeSubjectLines;

    const picked = available[Math.floor(Math.random() * available.length)];
    assignments.set(recruiter.id, picked);
    used.add(picked.id);
    companyUsed.set(recruiter.company, used);
  }
  return assignments;
}

/**
 * Random delay between 5-10 seconds.
 */
function randomDelay(): Promise<void> {
  const ms = 5000 + Math.random() * 5000;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface SendResult {
  recruiterId: string;
  recruiterName: string;
  email: string;
  templateUsed: string;
  subjectUsed: string;
  status: "sent" | "failed";
  error?: string;
}

export interface SendEmailsResponse {
  totalSent: number;
  totalFailed: number;
  results: SendResult[];
}

/**
 * Main bulk outreach function.
 * Sends personalized emails to a list of recruiters with template/subject rotation.
 */
export async function sendBulkOutreach(
  userId: string,
  recruiterIds: string[],
  templateCategory: string
): Promise<SendEmailsResponse> {
  const supabase = createServerSupabaseClient();

  // Deduplicate
  const uniqueIds = [...new Set(recruiterIds)];

  // Enforce batch limit
  if (uniqueIds.length > 50) {
    throw new Error("Maximum 50 recruiters per batch");
  }

  // Fetch recruiters with emails
  const { data: recruiters, error: recError } = await supabase
    .from("recruiters")
    .select("*, recruiter_emails(*)")
    .in("id", uniqueIds);

  if (recError || !recruiters) {
    throw new Error("Failed to fetch recruiters");
  }

  // Fetch templates by category
  const { data: templates } = await supabase
    .from("email_templates")
    .select("*")
    .eq("category", templateCategory);

  if (!templates || templates.length === 0) {
    throw new Error("Add at least one template in this category before sending");
  }

  // Fetch active subject lines
  const { data: subjectLines } = await supabase
    .from("subject_lines")
    .select("*")
    .eq("is_active", true);

  if (!subjectLines || subjectLines.length === 0) {
    throw new Error("Add at least one active subject line before sending");
  }

  // Get default resume
  const resume = await getDefaultResume();

  // Pick assignments
  const recruiterList = recruiters.map((r) => ({ id: r.id, company: r.company }));
  const templateAssignments = pickTemplates(recruiterList, templates);
  const subjectAssignments = pickSubjectLines(recruiterList, subjectLines);

  // Create transporter
  const transporter = createTransporter();

  const results: SendResult[] = [];

  for (let i = 0; i < recruiters.length; i++) {
    const recruiter = recruiters[i];
    const primaryEmail = recruiter.recruiter_emails?.find(
      (e: { is_primary: boolean }) => e.is_primary
    )?.email || recruiter.recruiter_emails?.[0]?.email;

    if (!primaryEmail) {
      results.push({
        recruiterId: recruiter.id,
        recruiterName: recruiter.name,
        email: "",
        templateUsed: "",
        subjectUsed: "",
        status: "failed",
        error: "No email address found",
      });
      continue;
    }

    const template = templateAssignments.get(recruiter.id)!;
    const subjectLine = subjectAssignments.get(recruiter.id)!;

    // Build variable data
    const variableData: Record<string, string> = {
      "recruiter.name": recruiter.name,
      "recruiter.company": recruiter.company,
      "recruiter.title": recruiter.title || "",
      "recruiter.email": primaryEmail,
    };

    const body = injectVariables(template.body, variableData);
    const subject = injectVariables(subjectLine.text, variableData);

    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: process.env.SMTP_USER,
        to: primaryEmail,
        subject,
        text: body,
      };

      if (resume) {
        mailOptions.attachments = [
          {
            filename: resume.filename,
            content: resume.buffer,
          },
        ];
      }

      await transporter.sendMail(mailOptions);

      // Log success
      await supabase.from("email_logs").insert({
        user_id: userId,
        recruiter_id: recruiter.id,
        template_id: template.id,
        subject_line_id: subjectLine.id,
        to_email: primaryEmail,
        subject,
        body,
        status: "sent",
      });

      // Update recruiter status
      await supabase
        .from("recruiters")
        .update({ status: "Mailed" })
        .eq("id", recruiter.id);

      // Increment subject line usage
      await supabase
        .from("subject_lines")
        .update({ usage_count: subjectLine.usage_count + 1 })
        .eq("id", subjectLine.id);

      results.push({
        recruiterId: recruiter.id,
        recruiterName: recruiter.name,
        email: primaryEmail,
        templateUsed: template.name,
        subjectUsed: subject,
        status: "sent",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Send failed";

      // Log failure
      await supabase.from("email_logs").insert({
        user_id: userId,
        recruiter_id: recruiter.id,
        template_id: template.id,
        subject_line_id: subjectLine.id,
        to_email: primaryEmail,
        subject,
        body,
        status: "failed",
        error_message: errorMessage,
      });

      results.push({
        recruiterId: recruiter.id,
        recruiterName: recruiter.name,
        email: primaryEmail,
        templateUsed: template.name,
        subjectUsed: subject,
        status: "failed",
        error: errorMessage,
      });
    }

    // Delay between sends (skip after last)
    if (i < recruiters.length - 1) {
      await randomDelay();
    }
  }

  return {
    totalSent: results.filter((r) => r.status === "sent").length,
    totalFailed: results.filter((r) => r.status === "failed").length,
    results,
  };
}
