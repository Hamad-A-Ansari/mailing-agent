-- Visitor tracking for the landing page.
-- Captures IP, geo, device, browser, ISP/org for each anonymous visit.
CREATE TABLE IF NOT EXISTS visitor_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip TEXT,
  path TEXT,
  referrer TEXT,
  user_agent TEXT,
  browser TEXT,
  os TEXT,
  device_type TEXT,        -- desktop, mobile, tablet, bot
  country TEXT,
  region TEXT,
  city TEXT,
  timezone TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  isp TEXT,                -- internet service provider
  org TEXT,                -- organization / company (e.g. "Microsoft Corporation")
  as_name TEXT,            -- autonomous system name
  is_bot BOOLEAN DEFAULT FALSE,
  emailed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_visitor_logs_created ON visitor_logs(created_at DESC);
CREATE INDEX idx_visitor_logs_ip ON visitor_logs(ip);
CREATE INDEX idx_visitor_logs_org ON visitor_logs(org);
