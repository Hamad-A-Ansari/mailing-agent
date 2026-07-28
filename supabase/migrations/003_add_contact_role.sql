-- Add role column to recruiters table for contact type categorization
ALTER TABLE recruiters ADD COLUMN role TEXT DEFAULT 'Recruiter';
