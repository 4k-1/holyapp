CREATE TYPE event_status AS ENUM ('upcoming', 'completed', 'cancelled');

CREATE TABLE event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parish(id),
  event_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_datetime TIMESTAMP NOT NULL,
  end_datetime TIMESTAMP,
  location VARCHAR(255),
  certificate_request_id UUID REFERENCES certificate_request(id),
  status event_status NOT NULL DEFAULT 'upcoming',
  created_by UUID NOT NULL REFERENCES app_user(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TYPE intention_type AS ENUM ('thanksgiving', 'healing', 'birthday', 'wedding_anniversary', 'death_anniversary', 'special_intention');

CREATE TABLE mass_intention (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parish(id),
  requester_name VARCHAR(255) NOT NULL,
  intention_type intention_type NOT NULL,
  intention_for VARCHAR(255) NOT NULL,
  schedule_date DATE NOT NULL
);

CREATE TYPE digitization_status AS ENUM ('pending', 'indexed', 'failed');

CREATE TABLE digitized_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parish(id),
  record_type VARCHAR(50) NOT NULL,
  book_number VARCHAR(20),
  page_number VARCHAR(20),
  uploaded_by UUID NOT NULL REFERENCES app_user(id),
  image_url VARCHAR(255) NOT NULL,
  ocr_text TEXT NOT NULL,
  status digitization_status NOT NULL DEFAULT 'pending',
  linked_record_id UUID,
  linked_record_type VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID REFERENCES parish(id),
  actor_id UUID NOT NULL REFERENCES app_user(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);