-- Separate table for LinkedIn job imports (not linked to applications/kanban)
CREATE TABLE linkedin_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    linkedin_job_id TEXT NOT NULL,
    job_title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    job_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_linkedin_jobs_user_job ON linkedin_jobs(user_id, linkedin_job_id);
ALTER TABLE linkedin_jobs DISABLE ROW LEVEL SECURITY;
