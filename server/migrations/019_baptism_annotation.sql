ALTER TABLE annotation ALTER COLUMN reference_record_id DROP NOT NULL;
ALTER TABLE annotation ALTER COLUMN reference_record_type DROP NOT NULL;

ALTER TABLE annotation ADD COLUMN IF NOT EXISTS event_date DATE;
ALTER TABLE annotation ADD COLUMN IF NOT EXISTS book_number VARCHAR(20);
ALTER TABLE annotation ADD COLUMN IF NOT EXISTS page_number VARCHAR(20);
ALTER TABLE annotation ADD COLUMN IF NOT EXISTS entry_number VARCHAR(20);
ALTER TABLE annotation ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'manual';

CREATE UNIQUE INDEX IF NOT EXISTS annotation_baptism_reference_uidx
  ON annotation (baptism_id, reference_record_type, reference_record_id)
  WHERE reference_record_id IS NOT NULL;
