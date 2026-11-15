-- The signatory's signature, uploaded per certificate type in Settings -> Certificates and printed on the
-- signature line. Kept in the database like the parish logo. It is never served from a public address:
-- it only reaches the office's certificate settings and the parishioner's own certificates.
ALTER TABLE certificate_configuration
  ADD COLUMN signature_image BYTEA,
  ADD COLUMN signature_updated_at TIMESTAMP;
