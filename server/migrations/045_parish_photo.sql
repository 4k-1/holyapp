-- A photo of the church, uploaded by the parish admin in Parish settings and shown on the parishioner
-- dashboard. Three columns on parish, like the logo (040); no table of its own, since a parish has one photo.
-- The address is built from photo_updated_at when read (/parishes/:id/photo?v=...), so a new photo is a new
-- address and browsers can keep the old one cached for good. Without a photo the portal keeps its default.
ALTER TABLE parish
  ADD COLUMN IF NOT EXISTS photo_image BYTEA,
  ADD COLUMN IF NOT EXISTS photo_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS photo_updated_at TIMESTAMP;
