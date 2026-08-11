-- Scheduled email follow-ups for outreach contacts
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  recruiter_id    UUID NOT NULL REFERENCES public.recruiters (id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  subject         TEXT NOT NULL,
  body            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'cancelled', 'failed')),
  scheduled_at    TIMESTAMPTZ NOT NULL,
  sent_at         TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS follow_ups_user_id_idx ON public.follow_ups (user_id);
CREATE INDEX IF NOT EXISTS follow_ups_status_idx ON public.follow_ups (status);
CREATE INDEX IF NOT EXISTS follow_ups_scheduled_at_idx ON public.follow_ups (scheduled_at);

ALTER TABLE public.follow_ups DISABLE ROW LEVEL SECURITY;
