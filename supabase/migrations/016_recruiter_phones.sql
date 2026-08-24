-- Recruiter phone numbers (owner-only feature)
CREATE TABLE IF NOT EXISTS public.recruiter_phones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID NOT NULL REFERENCES public.recruiters (id) ON DELETE CASCADE,
  phone       TEXT NOT NULL,
  label       TEXT DEFAULT 'mobile',  -- mobile, work, personal
  is_primary  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recruiter_phones_recruiter ON public.recruiter_phones (recruiter_id);

ALTER TABLE public.recruiter_phones DISABLE ROW LEVEL SECURITY;
