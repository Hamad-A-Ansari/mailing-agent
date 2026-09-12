-- Track which site a visit came from (e.g. "switch-faang", "portfolio").
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visitor_logs' AND column_name = 'source'
  ) THEN
    ALTER TABLE visitor_logs ADD COLUMN source TEXT DEFAULT 'landing';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_visitor_logs_source ON visitor_logs(source);
