-- A parish's own logo, uploaded by its admin in Parish settings and shown everywhere HolyApp shows the parish.
-- Kept in the database like the ledger photos, so it is backed up with everything else; seal_url points at
-- GET /parishes/:id/logo with a version so browsers fetch a new logo as soon as it changes.
ALTER TABLE parish
  ADD COLUMN logo_image BYTEA,
  ADD COLUMN logo_type VARCHAR(20),
  ADD COLUMN logo_updated_at TIMESTAMP;
