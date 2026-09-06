-- LinkedIn DM templates
-- Reusable message templates with variable placeholders for LinkedIn outreach.
CREATE TABLE IF NOT EXISTS dm_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'connection', -- connection, inmail, follow-up, referral
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dm_templates_user ON dm_templates(user_id);
CREATE INDEX idx_dm_templates_category ON dm_templates(user_id, category);
