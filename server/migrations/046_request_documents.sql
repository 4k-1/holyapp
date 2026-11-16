-- Supporting documents a parishioner attaches to a certificate request: photos of an old certificate or a
-- family record that help staff find the entry.
--
-- content is the photo re-saved as a JPEG (no location or camera data) and then encrypted with
-- DATA_ENCRYPTION_KEY. file_name is encrypted too, since names often carry a person's name.
-- Rows are deleted 7 days after the request is released or not approved (requestDocumentRetention.js).

CREATE TABLE IF NOT EXISTS certificate_request_document (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES certificate_request(id) ON DELETE CASCADE,
  parish_id UUID NOT NULL REFERENCES parish(id),
  uploaded_by UUID NOT NULL REFERENCES app_user(id),
  file_name TEXT NOT NULL,
  content BYTEA NOT NULL,
  byte_size INT NOT NULL CHECK (byte_size > 0),
  width INT NOT NULL,
  height INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS certificate_request_document_request_idx
  ON certificate_request_document (request_id, created_at);
