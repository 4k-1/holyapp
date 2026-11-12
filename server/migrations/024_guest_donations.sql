-- Guests can give online without an account, so an online gift may have no app user behind it.
ALTER TABLE donation ALTER COLUMN recorded_by DROP NOT NULL;
