-- Add message_id to email_logs for email threading (In-Reply-To / References headers)
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS message_id TEXT;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS in_reply_to TEXT;

-- Index for looking up message threads
CREATE INDEX IF NOT EXISTS idx_email_logs_message_id ON public.email_logs (message_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recruiter_id ON public.email_logs (recruiter_id);
