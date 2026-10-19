-- Parishioner requests are filed before a register record is linked.
ALTER TABLE certificate_request ALTER COLUMN record_id DROP NOT NULL;

-- Subject details from the request form (name, parents, date, relationship).
ALTER TABLE certificate_request
  ADD COLUMN IF NOT EXISTS subject_details JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Pickup stays "processing" in status; this flag is what the office UI reads as ready.
ALTER TABLE certificate_request
  ADD COLUMN IF NOT EXISTS pickup_ready BOOLEAN NOT NULL DEFAULT false;
