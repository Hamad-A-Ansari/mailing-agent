-- Email sync: threads, replies, bounce tracking, sync state
-- Enables IMAP-based reply detection, bounce monitoring, and conversation view

-- Track all synced email threads (both sent and received)
CREATE TABLE IF NOT EXISTS email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  message_id TEXT, -- RFC 5322 Message-ID header
  in_reply_to TEXT, -- References/In-Reply-To header (links to parent)
  thread_id TEXT, -- Gmail thread grouping (X-GM-THRID or derived)
  recruiter_id UUID REFERENCES recruiters(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('sent', 'received')),
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT,
  body_preview TEXT, -- First 500 chars
  body_html TEXT,
  is_reply BOOLEAN DEFAULT FALSE,
  is_bounce BOOLEAN DEFAULT FALSE,
  bounce_reason TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  starred BOOLEAN DEFAULT FALSE,
  imap_uid INTEGER, -- UID from IMAP for dedup
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_email_threads_user ON email_threads(user_id);
CREATE INDEX idx_email_threads_recruiter ON email_threads(recruiter_id);
CREATE INDEX idx_email_threads_message_id ON email_threads(message_id);
CREATE INDEX idx_email_threads_in_reply_to ON email_threads(in_reply_to);
CREATE INDEX idx_email_threads_thread_id ON email_threads(thread_id);
CREATE INDEX idx_email_threads_direction ON email_threads(user_id, direction);
CREATE INDEX idx_email_threads_is_reply ON email_threads(user_id, is_reply) WHERE is_reply = TRUE;
CREATE INDEX idx_email_threads_is_bounce ON email_threads(user_id, is_bounce) WHERE is_bounce = TRUE;
CREATE INDEX idx_email_threads_received ON email_threads(user_id, received_at DESC);
CREATE INDEX idx_email_threads_imap_uid ON email_threads(user_id, imap_uid);

-- Sync state: tracks last-synced position per user per mailbox folder
CREATE TABLE IF NOT EXISTS email_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  folder TEXT NOT NULL DEFAULT 'INBOX', -- INBOX, [Gmail]/Sent Mail, etc.
  last_uid INTEGER DEFAULT 0, -- Last IMAP UID we've processed
  last_synced_at TIMESTAMPTZ,
  total_synced INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, folder)
);

-- Add outreach_status to recruiters for auto-pipeline tracking
-- Values: pending, sent, replied, bounced, no_response
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recruiters' AND column_name = 'outreach_status'
  ) THEN
    ALTER TABLE recruiters ADD COLUMN outreach_status TEXT DEFAULT 'pending';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_recruiters_outreach_status ON recruiters(outreach_status);

-- Reply notifications table (for in-app badge)
CREATE TABLE IF NOT EXISTS reply_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  thread_id UUID REFERENCES email_threads(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reply_notifications_user ON reply_notifications(user_id, is_read);
