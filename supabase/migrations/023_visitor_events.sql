-- Session-aware visitor tracking.
-- visitor_logs stays one row per visit (page load) and carries the geo lookup.
-- visitor_events stores every in-page action (section viewed, project opened,
-- link clicked, ...) linked to its visit, so geo is looked up once per visit.

ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS session_id TEXT;   -- per-tab session (sessionStorage)
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS visitor_id TEXT;   -- per-browser id (localStorage)
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS visit_number INTEGER; -- 1 = first visit from this browser

CREATE INDEX IF NOT EXISTS idx_visitor_logs_session ON visitor_logs(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_visitor ON visitor_logs(visitor_id);

CREATE TABLE IF NOT EXISTS visitor_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES visitor_logs(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  visitor_id TEXT,
  source TEXT DEFAULT 'portfolio',
  action TEXT NOT NULL,           -- e.g. "viewed-section-experience", "clicked-github-from-hero"
  page TEXT,                      -- window.location.pathname when it happened
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  emailed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitor_events_session ON visitor_events(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_visitor_events_visit ON visitor_events(visit_id);
CREATE INDEX IF NOT EXISTS idx_visitor_events_created ON visitor_events(created_at DESC);

-- Only the service role (server routes) touches this table; block anon/auth clients.
ALTER TABLE visitor_events ENABLE ROW LEVEL SECURITY;
