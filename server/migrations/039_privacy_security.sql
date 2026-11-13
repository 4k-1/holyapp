-- Module 16: session/access control + room for AES-256 ciphertext (wider TEXT columns).

ALTER TABLE app_user
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE app_user
  ALTER COLUMN contact_number TYPE TEXT,
  ALTER COLUMN address TYPE TEXT;

ALTER TABLE refresh_token
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS device_label VARCHAR(160),
  ADD COLUMN IF NOT EXISTS ip VARCHAR(64),
  ADD COLUMN IF NOT EXISTS location VARCHAR(160),
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS device_fingerprint VARCHAR(64);

CREATE INDEX IF NOT EXISTS refresh_token_user_active_idx
  ON refresh_token (user_id)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS login_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  device_label VARCHAR(160) NOT NULL DEFAULT 'Unknown device',
  location VARCHAR(160) NOT NULL DEFAULT 'Unknown location',
  ip VARCHAR(64),
  status VARCHAR(20) NOT NULL,
  portal VARCHAR(40)
);

CREATE INDEX IF NOT EXISTS login_activity_user_idx
  ON login_activity (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS trusted_device (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  fingerprint_hash VARCHAR(64) NOT NULL,
  device_label VARCHAR(160),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, fingerprint_hash)
);

CREATE TABLE IF NOT EXISTS login_challenge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  code_hash VARCHAR(64) NOT NULL,
  device_fingerprint VARCHAR(64),
  user_agent TEXT,
  ip VARCHAR(64),
  location VARCHAR(160),
  portal VARCHAR(40),
  expires_at TIMESTAMP NOT NULL,
  consumed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS login_challenge_user_idx
  ON login_challenge (user_id, created_at DESC);

ALTER TABLE baptism
  ALTER COLUMN address TYPE TEXT,
  ALTER COLUMN place_of_birth TYPE TEXT,
  ALTER COLUMN place_of_baptism TYPE TEXT,
  ALTER COLUMN remarks TYPE TEXT;

ALTER TABLE confirmation
  ALTER COLUMN address TYPE TEXT,
  ALTER COLUMN place_of_confirmation TYPE TEXT,
  ALTER COLUMN baptism_place TYPE TEXT,
  ALTER COLUMN remarks TYPE TEXT;

ALTER TABLE marriage
  ALTER COLUMN place_of_marriage TYPE TEXT,
  ALTER COLUMN remarks TYPE TEXT;

ALTER TABLE death
  ALTER COLUMN remarks TYPE TEXT;

ALTER TABLE parish_personnel
  ALTER COLUMN contact_info TYPE TEXT;

ALTER TABLE mass_intention
  ALTER COLUMN requester_name TYPE TEXT,
  ALTER COLUMN intention_for TYPE TEXT,
  ALTER COLUMN contact TYPE TEXT;

ALTER TABLE donation
  ALTER COLUMN donor_name TYPE TEXT,
  ALTER COLUMN remarks TYPE TEXT;

ALTER TABLE marriage_application
  ALTER COLUMN remarks TYPE TEXT,
  ALTER COLUMN dispensation_notes TYPE TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marriage' AND column_name = 'marriage_address'
  ) THEN
    EXECUTE 'ALTER TABLE marriage ALTER COLUMN marriage_address TYPE TEXT';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'death' AND column_name = 'residence'
  ) THEN
    EXECUTE 'ALTER TABLE death ALTER COLUMN residence TYPE TEXT';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'death' AND column_name = 'place_of_burial'
  ) THEN
    EXECUTE 'ALTER TABLE death ALTER COLUMN place_of_burial TYPE TEXT';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'death' AND column_name = 'cause_of_death'
  ) THEN
    EXECUTE 'ALTER TABLE death ALTER COLUMN cause_of_death TYPE TEXT';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'marriage_party'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'marriage_party' AND column_name = 'address'
    ) THEN
      EXECUTE 'ALTER TABLE marriage_party ALTER COLUMN address TYPE TEXT';
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'marriage_party' AND column_name = 'birthplace'
    ) THEN
      EXECUTE 'ALTER TABLE marriage_party ALTER COLUMN birthplace TYPE TEXT';
    END IF;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'sponsor'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'sponsor' AND column_name = 'contact_number'
    ) THEN
      EXECUTE 'ALTER TABLE sponsor ALTER COLUMN contact_number TYPE TEXT';
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'sponsor' AND column_name = 'address'
    ) THEN
      EXECUTE 'ALTER TABLE sponsor ALTER COLUMN address TYPE TEXT';
    END IF;
  END IF;
END $$;
