-- Add priority and interview_date to applications
ALTER TABLE applications ADD COLUMN priority TEXT DEFAULT 'medium';
ALTER TABLE applications ADD COLUMN interview_date TIMESTAMPTZ;

-- Application history/timeline table
CREATE TABLE application_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    from_stage TEXT,
    to_stage TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_app_history_app ON application_history(application_id);
ALTER TABLE application_history DISABLE ROW LEVEL SECURITY;
