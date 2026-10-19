ALTER TABLE marriage ADD COLUMN IF NOT EXISTS minister VARCHAR(255);
UPDATE marriage SET minister = '' WHERE minister IS NULL;
ALTER TABLE marriage ALTER COLUMN minister SET NOT NULL;
