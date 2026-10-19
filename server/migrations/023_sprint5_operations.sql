ALTER TABLE parish_settings
  ADD COLUMN IF NOT EXISTS mass_intention_capacity INTEGER NOT NULL DEFAULT 5;

ALTER TABLE marriage_application
  ADD COLUMN IF NOT EXISTS parishioner_id UUID REFERENCES app_user(id),
  ADD COLUMN IF NOT EXISTS dispensation_needed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dispensation_status VARCHAR(20) NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS dispensation_notes TEXT,
  ADD COLUMN IF NOT EXISTS preferred_wedding_date DATE,
  ADD COLUMN IF NOT EXISTS preferred_wedding_start VARCHAR(32),
  ADD COLUMN IF NOT EXISTS preferred_wedding_end VARCHAR(32),
  ADD COLUMN IF NOT EXISTS wedding_event_id UUID REFERENCES event(id),
  ADD COLUMN IF NOT EXISTS wedding_date_status VARCHAR(20) NOT NULL DEFAULT 'none';

ALTER TABLE event
  ADD COLUMN IF NOT EXISTS assignee_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS record_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS show_on_overview BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS marriage_application_id UUID REFERENCES marriage_application(id);

ALTER TABLE mass_intention
  ADD COLUMN IF NOT EXISTS requester_id UUID REFERENCES app_user(id),
  ADD COLUMN IF NOT EXISTS schedule_time VARCHAR(32) NOT NULL DEFAULT '6:00 AM',
  ADD COLUMN IF NOT EXISTS schedule_label VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS offering DECIMAL(10,2) NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS contact VARCHAR(255),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS said_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES app_user(id);

CREATE TABLE IF NOT EXISTS parish_recurring_commitment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parish(id),
  label VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  days TEXT[] NOT NULL,
  slots JSONB NOT NULL,
  assignee VARCHAR(255) NOT NULL DEFAULT '',
  show_on_overview BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES app_user(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parish_schedule_override (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parish(id),
  occurrence_id VARCHAR(255) NOT NULL,
  assignee VARCHAR(255) NOT NULL DEFAULT '',
  UNIQUE (parish_id, occurrence_id)
);

CREATE INDEX IF NOT EXISTS idx_event_parish_start ON event (parish_id, start_datetime);
CREATE INDEX IF NOT EXISTS idx_mass_intention_slot ON mass_intention (parish_id, schedule_date, schedule_time);
CREATE INDEX IF NOT EXISTS idx_marriage_application_parish ON marriage_application (parish_id, created_at DESC);
