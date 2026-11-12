-- Marriage requirements a parish can set itself (item 5a).
--
-- 1. Each built-in requirement has a permanent template_key, so a parish can rename or turn one off
--    and it stays that way. Items a parish adds itself have no key.
-- 2. condition: the requirement applies only when the couple's answer is yes (e.g. widowed adds the
--    late spouse's death certificate). skip_when: it no longer applies when that answer is yes (the
--    Art. 34 affidavit replaces the marriage license).
-- 3. valid_for_days: a document must not expire before the wedding. Staff record the date on the
--    document (document_date) when they mark it received.
-- 4. The couple's answers are kept on the application (circumstances).
-- 5. CENOMAR is split into one for each party.

ALTER TABLE marriage_requirement_type ADD COLUMN template_key VARCHAR(40);
ALTER TABLE marriage_requirement_type ADD COLUMN condition VARCHAR(30) NOT NULL DEFAULT 'always'
  CHECK (condition IN ('always', 'widowed', 'previously_married', 'mixed_religion', 'foreign_party',
                       'cohabiting_5yrs', 'outside_home_parish'));
ALTER TABLE marriage_requirement_type ADD COLUMN skip_when VARCHAR(30)
  CHECK (skip_when IN ('widowed', 'previously_married', 'mixed_religion', 'foreign_party',
                       'cohabiting_5yrs', 'outside_home_parish'));
ALTER TABLE marriage_requirement_type ADD COLUMN valid_for_days INT CHECK (valid_for_days > 0);
ALTER TABLE marriage_requirement_type ADD COLUMN sort_order INT NOT NULL DEFAULT 1000;
ALTER TABLE marriage_requirement_type ADD COLUMN note VARCHAR(255);
ALTER TABLE marriage_requirement_type ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
CREATE UNIQUE INDEX marriage_requirement_type_key_idx
  ON marriage_requirement_type (parish_id, template_key) WHERE template_key IS NOT NULL;

ALTER TABLE marriage_application_requirement ADD COLUMN document_date DATE;

ALTER TABLE marriage_application ADD COLUMN circumstances JSONB NOT NULL DEFAULT '{}'::jsonb
  CHECK (jsonb_typeof(circumstances) = 'object');

-- The built-in names until now, matched to their keys (same list as marriageRequirements.js).
UPDATE marriage_requirement_type t
SET template_key = d.key, valid_for_days = d.days, sort_order = d.ord, skip_when = d.skip
FROM (VALUES
  ('Baptismal certificate (groom)', 'baptism_groom', 180, 10, NULL),
  ('Baptismal certificate (bride)', 'baptism_bride', 180, 20, NULL),
  ('Confirmation certificate (groom)', 'confirmation_groom', 180, 30, NULL),
  ('Confirmation certificate (bride)', 'confirmation_bride', 180, 40, NULL),
  ('Civil birth certificate (groom)', 'birth_groom', NULL, 50, NULL),
  ('Civil birth certificate (bride)', 'birth_bride', NULL, 60, NULL),
  ('CENOMAR', 'cenomar_groom', 180, 70, NULL),
  ('Marriage license', 'license', 120, 90, 'cohabiting_5yrs'),
  ('Pre-Cana / marriage preparation', 'precana', NULL, 200, NULL),
  ('Canonical interview', 'interview', NULL, 210, NULL),
  ('Banns published (three Sundays)', 'banns', NULL, 220, NULL)
) AS d(name, key, days, ord, skip)
WHERE t.requirement_name = d.name;

-- Short notes for the couple on the built-in items.
UPDATE marriage_requirement_type t
SET note = d.note
FROM (VALUES
  ('baptism_groom', 'Marked "for marriage purposes".'),
  ('baptism_bride', 'Marked "for marriage purposes".'),
  ('confirmation_groom', 'Marked "for marriage purposes".'),
  ('confirmation_bride', 'Marked "for marriage purposes".'),
  ('birth_groom', 'PSA copy.'),
  ('birth_bride', 'PSA copy.'),
  ('cenomar_groom', 'PSA Certificate of No Marriage.'),
  ('license', 'From the city or municipal civil registrar.')
) AS d(key, note)
WHERE t.template_key = d.key AND t.note IS NULL;

-- One CENOMAR for each party: the old one becomes the groom's, and the bride gets her own with the
-- same received status on each open application.
UPDATE marriage_requirement_type SET requirement_name = 'CENOMAR (groom)' WHERE template_key = 'cenomar_groom';

INSERT INTO marriage_requirement_type
  (parish_id, requirement_name, is_required, created_by, template_key, valid_for_days, sort_order, note)
SELECT parish_id, 'CENOMAR (bride)', is_required, created_by, 'cenomar_bride', 180, 80, note
FROM marriage_requirement_type
WHERE template_key = 'cenomar_groom';

INSERT INTO marriage_application_requirement
  (marriage_application_id, requirement_type_id, submitted, verified_by, verified_at)
SELECT r.marriage_application_id, bride.id, r.submitted, r.verified_by, r.verified_at
FROM marriage_application_requirement r
JOIN marriage_requirement_type groom ON groom.id = r.requirement_type_id AND groom.template_key = 'cenomar_groom'
JOIN marriage_requirement_type bride ON bride.parish_id = groom.parish_id AND bride.template_key = 'cenomar_bride';
