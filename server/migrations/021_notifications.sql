CREATE TABLE IF NOT EXISTS app_notification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parish(id),
  recipient_id UUID NOT NULL REFERENCES app_user(id),
  kind VARCHAR(40) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  href VARCHAR(255) NOT NULL DEFAULT 'notifications',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  read_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS app_notification_recipient_idx
  ON app_notification (recipient_id, parish_id, created_at DESC);
