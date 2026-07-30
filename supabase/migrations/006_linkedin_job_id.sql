-- Add linkedin_job_id for deduplication when importing from extension
ALTER TABLE applications ADD COLUMN linkedin_job_id TEXT;
CREATE UNIQUE INDEX idx_applications_linkedin_job_id ON applications(user_id, linkedin_job_id) WHERE linkedin_job_id IS NOT NULL;
