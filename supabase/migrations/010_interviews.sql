-- PlacePrep: interviews + interview_feedback tables
-- Safe to run alongside existing tables (recruiters, applications, etc.)

-- ---------------------------------------------------------------------------
-- interviews
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.interviews (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL,
  role         TEXT NOT NULL,
  level        TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'technical',
  techstack    TEXT[] NOT NULL DEFAULT '{}',
  questions    TEXT[] NOT NULL DEFAULT '{}',
  finalized    BOOLEAN NOT NULL DEFAULT false,
  cover_image  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS interviews_user_id_idx ON public.interviews (user_id);
CREATE INDEX IF NOT EXISTS interviews_created_at_idx ON public.interviews (created_at DESC);
CREATE INDEX IF NOT EXISTS interviews_finalized_idx ON public.interviews (finalized);

-- ---------------------------------------------------------------------------
-- interview_feedback
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.interview_feedback (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id           UUID NOT NULL REFERENCES public.interviews (id) ON DELETE CASCADE,
  user_id                TEXT NOT NULL,
  total_score            INTEGER NOT NULL,
  category_scores        JSONB NOT NULL DEFAULT '[]'::jsonb,
  strengths              TEXT[] NOT NULL DEFAULT '{}',
  areas_for_improvement  TEXT[] NOT NULL DEFAULT '{}',
  final_assessment       TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (interview_id, user_id)
);

CREATE INDEX IF NOT EXISTS interview_feedback_interview_id_idx ON public.interview_feedback (interview_id);
CREATE INDEX IF NOT EXISTS interview_feedback_user_id_idx ON public.interview_feedback (user_id);

-- RLS disabled for now (service role key bypasses it anyway, and this app
-- uses a single owner). Enable and add policies when multi-user support is needed.
ALTER TABLE public.interviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_feedback DISABLE ROW LEVEL SECURITY;
