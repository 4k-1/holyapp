-- E1: what each staff sign-in can open, area by area (Off, View or Manage).
-- Stored as {"registers": "manage", "certificates": "view", ...} for parish_staff accounts.
-- NULL means Manage on every area, so every staff account that exists today keeps the access it has.
-- Parish admins ignore this column; they always have every area.
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS staff_access JSONB;
