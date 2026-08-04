-- Per-user SMTP configuration for email sending
CREATE TABLE user_smtp_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    smtp_host TEXT NOT NULL,
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_password_encrypted TEXT NOT NULL,
    provider TEXT DEFAULT 'gmail',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_smtp_config_user ON user_smtp_config(user_id);
ALTER TABLE user_smtp_config DISABLE ROW LEVEL SECURITY;

CREATE TRIGGER user_smtp_config_updated_at
    BEFORE UPDATE ON user_smtp_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
