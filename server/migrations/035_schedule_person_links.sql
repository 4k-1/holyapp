-- C2: schedule assignments point at the person, not a typed name.
--
-- 1. Regular Masses (parish_recurring_commitment) and one-off changes to a single Mass
--    (parish_schedule_override) get assigned_to, like event already has. The name shown always comes
--    from the Staff record, so a renamed person shows their new name everywhere.
-- 2. The text columns (assignee, event.assignee_name) now hold only a guest's name: someone who is not
--    on the staff list, such as a visiting priest.
-- 3. Names already typed are matched to the staff list; any that match no one stay as guests.

ALTER TABLE parish_recurring_commitment
  ADD COLUMN assigned_to UUID REFERENCES parish_personnel(id) ON DELETE SET NULL;
ALTER TABLE parish_schedule_override
  ADD COLUMN assigned_to UUID REFERENCES parish_personnel(id) ON DELETE SET NULL;

-- "Fr. Juan Santos" as shown, or the bare name.
CREATE TEMP TABLE c2_names AS
SELECT id, parish_id,
       lower(full_name) AS plain,
       lower(concat_ws(' ', honorific, full_name) || COALESCE(', ' || post_nominals, '')) AS shown
FROM parish_personnel
WHERE full_name IS NOT NULL;

UPDATE parish_recurring_commitment c
SET assigned_to = (
      SELECT n.id FROM c2_names n
      WHERE n.parish_id = c.parish_id AND lower(trim(c.assignee)) IN (n.plain, n.shown)
      ORDER BY (lower(trim(c.assignee)) = n.shown) DESC
      LIMIT 1
    )
WHERE trim(c.assignee) <> '';
UPDATE parish_recurring_commitment SET assignee = '' WHERE assigned_to IS NOT NULL;

UPDATE parish_schedule_override o
SET assigned_to = (
      SELECT n.id FROM c2_names n
      WHERE n.parish_id = o.parish_id AND lower(trim(o.assignee)) IN (n.plain, n.shown)
      ORDER BY (lower(trim(o.assignee)) = n.shown) DESC
      LIMIT 1
    )
WHERE trim(o.assignee) <> '';
UPDATE parish_schedule_override SET assignee = '' WHERE assigned_to IS NOT NULL;

UPDATE event e
SET assigned_to = (
      SELECT n.id FROM c2_names n
      WHERE n.parish_id = e.parish_id AND lower(trim(e.assignee_name)) IN (n.plain, n.shown)
      ORDER BY (lower(trim(e.assignee_name)) = n.shown) DESC
      LIMIT 1
    )
WHERE e.assigned_to IS NULL AND trim(COALESCE(e.assignee_name, '')) <> '';
UPDATE event SET assignee_name = NULL WHERE assigned_to IS NOT NULL;

DROP TABLE c2_names;
