-- Parishioner sign-up proves the email first: email -> 4-digit code -> name and birthday -> password.
-- No account exists until the last step, so an abandoned or mistyped sign-up leaves no account behind.
--
-- One row per email while a sign-up is in progress, and nothing after:
--   - sending a code inserts the row, or replaces its code in place (no history rows);
--   - the right code swaps the code for a short-lived sign-up token on the same row;
--   - finishing deletes the row in the same transaction that creates the account;
--   - rows past expires_at are deleted whenever a sign-up starts, so nothing outlives an hour.
-- Codes and tokens are stored only as SHA-256 hashes. The primary key is the only index needed:
-- every lookup is by email, and the cleanup scans a table that holds only sign-ups in progress.
CREATE TABLE IF NOT EXISTS signup_verification (
  email TEXT PRIMARY KEY CHECK (email = lower(email)),
  parish_id UUID NOT NULL REFERENCES parish(id) ON DELETE CASCADE,
  code_hash CHAR(64),
  token_hash CHAR(64),
  attempts SMALLINT NOT NULL DEFAULT 0,
  sends SMALLINT NOT NULL DEFAULT 1,
  first_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- The old flow made the account first and kept its codes here; nothing uses it now.
DROP TABLE IF EXISTS email_verification;
