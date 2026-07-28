/**
 * TypeScript interfaces for all database tables.
 * These map directly to the Supabase PostgreSQL schema.
 */

export interface Recruiter {
  id: string;
  user_id: string;
  name: string;
  company: string;
  title: string | null;
  role: ContactRole;
  notes: string | null;
  status: RecruiterStatus;
  created_at: string;
  updated_at: string;
}

export type ContactRole =
  | "Recruiter"
  | "Software Developer"
  | "Engineering Manager"
  | "Hiring Manager"
  | "Director"
  | "VP"
  | "Talent Sourcer"
  | "Other";

export type RecruiterStatus = "Mailed" | "Follow Up" | "Replied" | "No Response";

export interface RecruiterEmail {
  id: string;
  recruiter_id: string;
  email: string;
  type: string;
  is_primary: boolean;
}

export interface EmailTemplate {
  id: string;
  user_id: string;
  name: string;
  category: TemplateCategory;
  body: string;
  created_at: string;
  updated_at: string;
}

export type TemplateCategory = "outreach" | "follow-up" | "referral";

export interface SubjectLine {
  id: string;
  user_id: string;
  text: string;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

export interface Resume {
  id: string;
  user_id: string;
  filename: string;
  display_name: string | null;
  storage_path: string;
  file_size: number;
  is_default: boolean;
  created_at: string;
}

export interface EmailLog {
  id: string;
  user_id: string;
  recruiter_id: string;
  template_id: string | null;
  subject_line_id: string | null;
  resume_id: string | null;
  to_email: string;
  subject: string;
  body: string;
  status: "sent" | "failed";
  error_message: string | null;
  sent_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
