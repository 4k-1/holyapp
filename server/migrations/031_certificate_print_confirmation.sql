-- "Did it print correctly?" (A3).
--
-- 1. A printed copy is confirmed by whoever checked the paper, with when. Until then it shows on
--    the dashboard as "Printed, not confirmed". Digital copies are never printed and are
--    confirmed when issued.
-- 2. A copy that printed wrongly is voided as spoiled, with a reason: status 'invalid' like a
--    revoked copy, with void_kind telling the two apart. Its number stays used, so the count has
--    no gap, and its QR code shows it as void.
--
-- Copies issued before this are taken as confirmed, so the dashboard starts empty.

ALTER TABLE certificate ADD COLUMN print_confirmed_at TIMESTAMP;
ALTER TABLE certificate ADD COLUMN print_confirmed_by UUID REFERENCES app_user(id);
ALTER TABLE certificate ADD COLUMN void_kind VARCHAR(10)
  CHECK (void_kind IN ('revoked', 'spoiled'));

UPDATE certificate
SET print_confirmed_at = issued_at, print_confirmed_by = issued_by
WHERE print_confirmed_at IS NULL;

UPDATE certificate SET void_kind = 'revoked' WHERE status = 'invalid' AND void_kind IS NULL;

CREATE INDEX certificate_unconfirmed_idx ON certificate (parish_id, issued_at)
  WHERE print_confirmed_at IS NULL AND status = 'valid';
