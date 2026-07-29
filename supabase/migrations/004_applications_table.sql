-- Application Tracker table
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    job_title TEXT NOT NULL,
    company TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'Saved' CHECK (stage IN ('Saved', 'Applied', 'OA', 'Phone Screen', 'Technical Interview', 'Final Round', 'Offer', 'Rejected', 'Accepted')),
    job_url TEXT,
    job_description TEXT,
    resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES recruiters(id) ON DELETE SET NULL,
    notes TEXT,
    location TEXT,
    department TEXT,
    source TEXT,
    applied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_applications_user_stage ON applications(user_id, stage);
CREATE INDEX idx_applications_user_company ON applications(user_id, company);

CREATE TRIGGER applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Disable RLS (using service role key)
ALTER TABLE applications DISABLE ROW LEVEL SECURITY;
