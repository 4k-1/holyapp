-- Several titles per staff member (item 4).
--
-- 1. A name in parts: honorific ("Rev. Fr.", "Msgr.", "Sr."), the plain name in full_name, and
--    letters after the name ("SVD"). Shown together as "Rev. Fr. Juan Santos, SVD".
-- 2. clergy_rank decides who is clergy (priest, deacon); a title no longer does. It is worked out
--    from the honorific on every save (Fr./Msgr. priest, Dcn. deacon, Sr./Bro. religious, else lay),
--    so a priest who is also a school chaplain stays a priest whatever his titles.
-- 3. role_title stays the primary title (with an optional place in role_scope); other_titles holds
--    the rest as [{"title": "...", "scope": "..."}]. No history is kept: a removed title is gone.
-- 4. Only one active person per parish may hold "Parish Priest"; the server checks this.

ALTER TABLE parish_personnel ADD COLUMN honorific VARCHAR(30);
ALTER TABLE parish_personnel ADD COLUMN post_nominals VARCHAR(30);
ALTER TABLE parish_personnel ADD COLUMN clergy_rank VARCHAR(10) NOT NULL DEFAULT 'lay'
  CHECK (clergy_rank IN ('priest', 'deacon', 'religious', 'lay'));
ALTER TABLE parish_personnel ADD COLUMN role_scope VARCHAR(100);
ALTER TABLE parish_personnel ADD COLUMN other_titles JSONB NOT NULL DEFAULT '[]'::jsonb
  CHECK (jsonb_typeof(other_titles) = 'array');

-- Letters after the name: "Juan Santos, SVD".
UPDATE parish_personnel
SET post_nominals = trim(substring(full_name FROM ',\s*([A-Za-z. ]{2,20})$')),
    full_name = trim(regexp_replace(full_name, ',\s*[A-Za-z. ]{2,20}$', ''))
WHERE full_name ~ ',\s*[A-Za-z. ]{2,20}$';

-- Honorific at the front: "Rev. Fr. Juan Santos", "Fr. Juan Santos", "Msgr. …", "Sr. …".
UPDATE parish_personnel
SET honorific = trim(substring(full_name FROM '^((?:Rev\.?\s+|Most\s+Rev\.?\s+)?(?:Fr|Msgr|Sr|Bro|Dcn|Deacon|Rev)\.?)\s+')),
    full_name = trim(regexp_replace(full_name, '^(?:Rev\.?\s+|Most\s+Rev\.?\s+)?(?:Fr|Msgr|Sr|Bro|Dcn|Deacon|Rev)\.?\s+', ''))
WHERE full_name ~ '^(?:Rev\.?\s+|Most\s+Rev\.?\s+)?(?:Fr|Msgr|Sr|Bro|Dcn|Deacon|Rev)\.?\s+\S';

-- A priest or deacon saved without an honorific gets one, so the honorific can decide clergy status.
UPDATE parish_personnel SET honorific = 'Dcn.' WHERE honorific IS NULL AND role_title = 'Deacon';
UPDATE parish_personnel SET honorific = 'Fr.'
WHERE honorific IS NULL AND role_title IN ('Parish Priest', 'Parochial Vicar', 'Guest Priest', 'Priest');

-- Clergy status from the honorific (same rule as rankForHonorific in personnelRoles.js).
UPDATE parish_personnel
SET clergy_rank = CASE
  WHEN lower(honorific) ~ '\m(dcn|deacon)\M' THEN 'deacon'
  WHEN lower(honorific) ~ '\m(fr|father|msgr|monsignor|bishop|bp|archbishop|abp|cardinal)\M' THEN 'priest'
  WHEN lower(honorific) ~ '\m(sr|sister|bro|brother|mother|mo)\M' THEN 'religious'
  WHEN lower(honorific) ~ '\m(rev|reverend)\M' THEN 'priest'
  ELSE 'lay'
END;
