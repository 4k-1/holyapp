-- Digitized Ledger: register books, their scanned pages, and which page and row a baptism
-- record was made from.
--
-- The flow: start a book → upload photos of its pages → read a page (Gemini) and save its
-- rows as records. The photos are kept in the database (bytea) so they're backed up with
-- the records and need no separate file storage. Lists never select the photo columns.

CREATE TABLE ledger_book (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parish(id),
  sacrament_type VARCHAR(20) NOT NULL
    CHECK (sacrament_type IN ('baptism', 'confirmation', 'marriage', 'death')),
  title VARCHAR(200) NOT NULL,
  volume_label VARCHAR(60) NOT NULL,
  year_start INT NOT NULL,
  year_end INT NOT NULL,
  created_by UUID NOT NULL REFERENCES app_user(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (year_end >= year_start),
  UNIQUE (parish_id, sacrament_type, volume_label)
);

CREATE TABLE ledger_page (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parish(id),
  book_id UUID NOT NULL REFERENCES ledger_book(id) ON DELETE CASCADE,
  -- The page number written in the book. One photo = one page number (for an open book
  -- photographed as a spread, the number of the left page).
  page_number INT NOT NULL CHECK (page_number >= 1),
  image BYTEA NOT NULL,
  image_type VARCHAR(40) NOT NULL,
  image_width INT NOT NULL,
  image_height INT NOT NULL,
  thumbnail BYTEA NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES app_user(id),
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  -- The last reading of the page (Gemini), so it isn't paid for twice, and the text the
  -- ledger search looks through.
  reading JSONB,
  read_at TIMESTAMP,
  read_by UUID REFERENCES app_user(id),
  search_text TEXT NOT NULL DEFAULT '',
  UNIQUE (book_id, page_number)
);

CREATE INDEX ledger_page_book_idx ON ledger_page (book_id, page_number);

-- Which scanned page and row a baptism record was made from (null for records typed in).
ALTER TABLE baptism ADD COLUMN ledger_page_id UUID REFERENCES ledger_page(id) ON DELETE SET NULL;
ALTER TABLE baptism ADD COLUMN ledger_row INT;
CREATE INDEX baptism_ledger_page_idx ON baptism (ledger_page_id) WHERE ledger_page_id IS NOT NULL;
