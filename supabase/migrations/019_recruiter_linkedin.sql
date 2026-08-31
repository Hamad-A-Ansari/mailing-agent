-- Add LinkedIn profile URL to recruiters
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recruiters' AND column_name = 'linkedin_url'
  ) THEN
    ALTER TABLE recruiters ADD COLUMN linkedin_url TEXT;
  END IF;
END $$;
