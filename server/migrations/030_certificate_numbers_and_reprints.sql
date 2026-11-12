-- Numbered certificate copies and a reprint log (A2).
--
-- 1. Each issued copy gets a running number per parish, sacrament and year, e.g. BAP-2026-000143,
--    from the counter table of migration 026, so two copies issued at the same moment can't share
--    a number. The counter is keyed by sacrament ("CERT-BAP"), not by the parish's chosen prefix,
--    so changing the prefix in Settings carries on the count instead of restarting it.
-- 2. Every reprint is logged against its copy: who, when and why. A reprint is not a new copy.
--
-- Copies issued before this keep their old CF- codes, which are already on paper. This year's
-- counters start after the copies already issued this year, so the last number still equals
-- the number of copies issued.

ALTER TABLE reference_counter ALTER COLUMN prefix TYPE VARCHAR(12);

-- The next value of a counter, with the (Philippine) year it belongs to.
CREATE OR REPLACE FUNCTION next_count(p_parish_id UUID, p_key TEXT, OUT count_year INT, OUT count_value INT) AS $$
BEGIN
  count_year := reference_year((NOW() AT TIME ZONE 'UTC')::timestamp);
  INSERT INTO reference_counter AS rc (parish_id, prefix, year, last_value)
  VALUES (p_parish_id, p_key, count_year, 1)
  ON CONFLICT ON CONSTRAINT reference_counter_pkey
  DO UPDATE SET last_value = rc.last_value + 1
  RETURNING rc.last_value INTO count_value;
END;
$$ LANGUAGE plpgsql;

INSERT INTO reference_counter (parish_id, prefix, year, last_value)
SELECT parish_id,
       'CERT-' || CASE record_type
         WHEN 'baptism' THEN 'BAP'
         WHEN 'confirmation' THEN 'CFM'
         WHEN 'marriage' THEN 'MRG'
         ELSE 'DTH'
       END,
       reference_year(issued_at),
       COUNT(*)
FROM certificate
GROUP BY 1, 2, 3
ON CONFLICT (parish_id, prefix, year)
DO UPDATE SET last_value = GREATEST(reference_counter.last_value, EXCLUDED.last_value);

CREATE UNIQUE INDEX certificate_code_idx ON certificate (parish_id, certificate_code)
  WHERE certificate_code IS NOT NULL;

CREATE TABLE certificate_reprint (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES certificate(id),
  parish_id UUID NOT NULL REFERENCES parish(id),
  reason VARCHAR(20) NOT NULL
    CHECK (reason IN ('paper_jam', 'printer_error', 'print_quality', 'other')),
  note TEXT,
  printed_by UUID NOT NULL REFERENCES app_user(id),
  printed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT certificate_reprint_other_note CHECK (reason <> 'other' OR length(trim(coalesce(note, ''))) > 0)
);

CREATE INDEX certificate_reprint_certificate_idx ON certificate_reprint (certificate_id);
CREATE INDEX certificate_reprint_parish_idx ON certificate_reprint (parish_id, printed_at);
