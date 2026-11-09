-- B5 + C5: the parish's own dates for the liturgical calendar.
--
-- The Church calendar itself is worked out in code. Each parish adds its fiesta and any other local
-- feasts (a chapel's patron, for example), kept as month and day ("MM-DD") because they recur yearly.

ALTER TABLE parish_settings
  ADD COLUMN fiesta_date VARCHAR(5),
  ADD COLUMN local_feasts JSONB NOT NULL DEFAULT '[]'::jsonb;
