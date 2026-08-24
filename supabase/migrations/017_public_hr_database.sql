-- Public HR Database: shared recruiter contacts that all users can view
-- Only the owner (OWNER_USER_ID) can add/edit/delete entries.
-- Users can copy entries to their personal contacts.

CREATE TABLE IF NOT EXISTS public.public_hr_database (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  company     TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'Recruiter',
  emails      TEXT[] NOT NULL DEFAULT '{}',
  added_by    TEXT,  -- owner's user_id for audit
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_hr_company ON public.public_hr_database (company);
CREATE INDEX IF NOT EXISTS idx_public_hr_role ON public.public_hr_database (role);
CREATE INDEX IF NOT EXISTS idx_public_hr_name ON public.public_hr_database USING GIN (to_tsvector('english', name));

ALTER TABLE public.public_hr_database DISABLE ROW LEVEL SECURITY;
