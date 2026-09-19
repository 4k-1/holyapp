ALTER TABLE parish_settings
  ADD COLUMN IF NOT EXISTS patron VARCHAR(255),
  ADD COLUMN IF NOT EXISTS diocese VARCHAR(255);

ALTER TABLE certificate_configuration
  ADD COLUMN IF NOT EXISTS signatory_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS signatory_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS numbering_prefix VARCHAR(10),
  ADD COLUMN IF NOT EXISTS footer_text TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS certificate_configuration_parish_type_idx
  ON certificate_configuration (parish_id, certificate_type);

CREATE UNIQUE INDEX IF NOT EXISTS service_fee_parish_name_idx
  ON service_fee (parish_id, service_name);

CREATE UNIQUE INDEX IF NOT EXISTS parish_personnel_user_id_idx
  ON parish_personnel (user_id)
  WHERE user_id IS NOT NULL;
