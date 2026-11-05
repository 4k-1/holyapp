-- Short reference numbers people can read out, write on a claim slip and search for: CR-2026-00042.
-- The UUID stays the key in the database, URLs and the API. Each parish numbers each kind of request from 1,
-- starting again every year (by Philippine time). A trigger assigns the number, so every insert path gets one.

CREATE TABLE IF NOT EXISTS reference_counter (
  parish_id UUID NOT NULL REFERENCES parish(id),
  prefix VARCHAR(4) NOT NULL,
  year INT NOT NULL,
  last_value INT NOT NULL,
  PRIMARY KEY (parish_id, prefix, year)
);

ALTER TABLE certificate_request ADD COLUMN IF NOT EXISTS reference_no VARCHAR(20);
ALTER TABLE marriage_application ADD COLUMN IF NOT EXISTS reference_no VARCHAR(20);
ALTER TABLE mass_intention ADD COLUMN IF NOT EXISTS reference_no VARCHAR(20);

CREATE OR REPLACE FUNCTION reference_year(created TIMESTAMP) RETURNS INT AS $$
  SELECT EXTRACT(YEAR FROM (COALESCE(created, NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Manila')::int;
$$ LANGUAGE sql STABLE;

-- The upsert locks the counter row, so two requests saved at the same moment can't get the same number.
CREATE OR REPLACE FUNCTION assign_reference_no() RETURNS TRIGGER AS $$
DECLARE
  ref_prefix TEXT := TG_ARGV[0];
  yr INT := reference_year(NEW.created_at);
  n INT;
BEGIN
  IF NEW.reference_no IS NOT NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO reference_counter (parish_id, prefix, year, last_value)
  VALUES (NEW.parish_id, ref_prefix, yr, 1)
  ON CONFLICT (parish_id, prefix, year)
  DO UPDATE SET last_value = reference_counter.last_value + 1
  RETURNING last_value INTO n;
  NEW.reference_no := ref_prefix || '-' || yr || '-' || lpad(n::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Number the rows that already exist, oldest first, then start the counters after them.
DO $$
DECLARE
  spec RECORD;
BEGIN
  FOR spec IN SELECT * FROM (VALUES
    ('certificate_request', 'CR'),
    ('marriage_application', 'MA'),
    ('mass_intention', 'MI')
  ) AS s(tbl, prefix)
  LOOP
    EXECUTE format(
      $q$
      WITH numbered AS (
        SELECT id, reference_year(created_at) AS yr,
               ROW_NUMBER() OVER (PARTITION BY parish_id, reference_year(created_at) ORDER BY created_at, id) AS n
        FROM %1$I
        WHERE reference_no IS NULL
      )
      UPDATE %1$I t
      SET reference_no = %2$L || '-' || numbered.yr || '-' || lpad(numbered.n::text, 5, '0')
      FROM numbered
      WHERE t.id = numbered.id
      $q$, spec.tbl, spec.prefix);

    EXECUTE format(
      $q$
      INSERT INTO reference_counter (parish_id, prefix, year, last_value)
      SELECT parish_id, %2$L, reference_year(created_at), COUNT(*)
      FROM %1$I
      GROUP BY parish_id, reference_year(created_at)
      ON CONFLICT (parish_id, prefix, year)
      DO UPDATE SET last_value = GREATEST(reference_counter.last_value, EXCLUDED.last_value)
      $q$, spec.tbl, spec.prefix);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS certificate_request_reference_no ON certificate_request;
CREATE TRIGGER certificate_request_reference_no BEFORE INSERT ON certificate_request
  FOR EACH ROW EXECUTE FUNCTION assign_reference_no('CR');

DROP TRIGGER IF EXISTS marriage_application_reference_no ON marriage_application;
CREATE TRIGGER marriage_application_reference_no BEFORE INSERT ON marriage_application
  FOR EACH ROW EXECUTE FUNCTION assign_reference_no('MA');

DROP TRIGGER IF EXISTS mass_intention_reference_no ON mass_intention;
CREATE TRIGGER mass_intention_reference_no BEFORE INSERT ON mass_intention
  FOR EACH ROW EXECUTE FUNCTION assign_reference_no('MI');

ALTER TABLE certificate_request ALTER COLUMN reference_no SET NOT NULL;
ALTER TABLE marriage_application ALTER COLUMN reference_no SET NOT NULL;
ALTER TABLE mass_intention ALTER COLUMN reference_no SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS certificate_request_reference_no_idx ON certificate_request (parish_id, reference_no);
CREATE UNIQUE INDEX IF NOT EXISTS marriage_application_reference_no_idx ON marriage_application (parish_id, reference_no);
CREATE UNIQUE INDEX IF NOT EXISTS mass_intention_reference_no_idx ON mass_intention (parish_id, reference_no);
