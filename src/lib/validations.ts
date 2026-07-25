import { z } from "zod";

// ============================================================
// Recruiter Schemas
// ============================================================

export const emailEntrySchema = z.object({
  email: z.string().email("Invalid email address"),
  type: z.string().default("work"),
  is_primary: z.boolean().default(false),
});

export const createRecruiterSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().min(1, "Company is required"),
  title: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  emails: z.array(emailEntrySchema).min(1, "At least one email is required"),
});

export const updateRecruiterSchema = createRecruiterSchema.partial().extend({
  status: z.enum(["Mailed", "Follow Up", "Replied", "No Response"]).optional(),
});

// ============================================================
// Template Schemas
// ============================================================

export const createTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(["outreach", "follow-up", "referral"]),
  body: z.string().min(1, "Body is required"),
});

export const updateTemplateSchema = createTemplateSchema.partial();

// ============================================================
// Subject Line Schemas
// ============================================================

export const createSubjectLineSchema = z.object({
  text: z.string().min(1, "Subject line text is required"),
});

export const updateSubjectLineSchema = z.object({
  text: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
});
