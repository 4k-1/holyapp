ALTER TABLE parish ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS parish_slug_key ON parish (slug);

ALTER TABLE app_user ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS address VARCHAR(255);

CREATE TABLE IF NOT EXISTS email_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  code_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  consumed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_user_id ON email_verification(user_id);

CREATE TABLE IF NOT EXISTS password_reset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  consumed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset(user_id);
