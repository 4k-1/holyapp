CREATE TABLE parishioner_record (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parishioner_id UUID NOT NULL REFERENCES parishioner(id),
  record_type VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  linked_by UUID NOT NULL REFERENCES app_user(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE annotation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baptism_id UUID NOT NULL REFERENCES baptism(id),
  annotation_type VARCHAR(50) NOT NULL,
  reference_record_type VARCHAR(50) NOT NULL,
  reference_record_id UUID NOT NULL,
  annotated_by UUID NOT NULL REFERENCES app_user(id),
  annotated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE TYPE certificate_status AS ENUM ('valid', 'superseded', 'invalid');

CREATE TABLE certificate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  parish_id UUID NOT NULL REFERENCES parish(id),
  version INT NOT NULL,
  hash VARCHAR(255) NOT NULL,
  previous_certificate_id UUID REFERENCES certificate(id),
  status certificate_status NOT NULL DEFAULT 'valid',
  pdf_url VARCHAR(255) NOT NULL,
  qr_code VARCHAR(255) NOT NULL,
  issued_by UUID NOT NULL REFERENCES app_user(id),
  issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
  invalidated_by UUID REFERENCES app_user(id),
  invalidated_at TIMESTAMP,
  invalidation_reason TEXT
);

CREATE TYPE cert_request_type AS ENUM ('online', 'walkin');
CREATE TYPE cert_request_status AS ENUM ('pending', 'processing', 'released', 'rejected');
CREATE TYPE delivery_method AS ENUM ('pickup', 'digital');

CREATE TABLE certificate_request (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parish(id),
  request_type cert_request_type NOT NULL,
  parishioner_id UUID REFERENCES parishioner(id),
  record_type VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  certificate_id UUID REFERENCES certificate(id),
  purpose VARCHAR(255) NOT NULL,
  copies INT NOT NULL,
  status cert_request_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  requested_by UUID REFERENCES app_user(id),
  processed_by UUID REFERENCES app_user(id),
  delivery_method delivery_method,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);