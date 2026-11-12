-- Two shared building blocks, first used by donations.
--
-- 1. next_number(): the next number in a series, e.g. DON-2026-000231. Shares the counter table
--    from migration 026, so each parish numbers each series from 1, starting again every year
--    (Philippine time), and two saves at the same moment can't get the same number.
-- 2. Void or correct, never overwrite: a voided entry stays, marked with who voided it, when and
--    why, and drops out of totals. A correction voids the old entry and points the new one at it.

CREATE OR REPLACE FUNCTION next_number(p_parish_id UUID, p_prefix TEXT, p_digits INT DEFAULT 6)
RETURNS TEXT AS $$
DECLARE
  yr INT := reference_year((NOW() AT TIME ZONE 'UTC')::timestamp);
  n INT;
BEGIN
  INSERT INTO reference_counter (parish_id, prefix, year, last_value)
  VALUES (p_parish_id, p_prefix, yr, 1)
  ON CONFLICT (parish_id, prefix, year)
  DO UPDATE SET last_value = reference_counter.last_value + 1
  RETURNING last_value INTO n;
  RETURN p_prefix || '-' || yr || '-' || lpad(n::text, p_digits, '0');
END;
$$ LANGUAGE plpgsql;

ALTER TABLE donation ADD COLUMN receipt_no VARCHAR(20);
ALTER TABLE donation ADD COLUMN voided_at TIMESTAMP;
ALTER TABLE donation ADD COLUMN voided_by UUID REFERENCES app_user(id);
ALTER TABLE donation ADD COLUMN void_reason TEXT;
ALTER TABLE donation ADD COLUMN replaces_id UUID REFERENCES donation(id);

ALTER TABLE donation ADD CONSTRAINT donation_void_complete CHECK (
  (voided_at IS NULL AND voided_by IS NULL AND void_reason IS NULL)
  OR (voided_at IS NOT NULL AND voided_by IS NOT NULL AND length(trim(void_reason)) > 0)
);

-- Number the gifts already received (office gifts, and online gifts that were paid), oldest
-- first, then start each counter after them. Unpaid online gifts get a number when paid.
WITH received AS (
  SELECT d.id, d.parish_id, reference_year(d.created_at) AS yr,
         ROW_NUMBER() OVER (PARTITION BY d.parish_id, reference_year(d.created_at) ORDER BY d.created_at, d.id) AS n
  FROM donation d
  LEFT JOIN payment p ON p.donation_id = d.id
  WHERE p.id IS NULL OR p.status = 'paid'
)
UPDATE donation d
SET receipt_no = 'DON-' || received.yr || '-' || lpad(received.n::text, 6, '0')
FROM received
WHERE d.id = received.id;

INSERT INTO reference_counter (parish_id, prefix, year, last_value)
SELECT parish_id, 'DON', reference_year(created_at), COUNT(*)
FROM donation
WHERE receipt_no IS NOT NULL
GROUP BY parish_id, reference_year(created_at)
ON CONFLICT (parish_id, prefix, year)
DO UPDATE SET last_value = GREATEST(reference_counter.last_value, EXCLUDED.last_value);

CREATE UNIQUE INDEX donation_receipt_no_idx ON donation (parish_id, receipt_no);
-- A gift can be corrected only once; the correction can itself be corrected.
CREATE UNIQUE INDEX donation_replaces_idx ON donation (replaces_id) WHERE replaces_id IS NOT NULL;
