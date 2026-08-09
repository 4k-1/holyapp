CREATE TABLE parish_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL UNIQUE REFERENCES parish(id),
  logo_url VARCHAR(255),
  certificate_header TEXT,
  certificate_footer TEXT,
  updated_by UUID NOT NULL REFERENCES app_user(id),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE certificate_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parish(id),
  certificate_type VARCHAR(50) NOT NULL,
  qr_enabled BOOLEAN NOT NULL DEFAULT true,
  digital_signature_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID NOT NULL REFERENCES app_user(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);