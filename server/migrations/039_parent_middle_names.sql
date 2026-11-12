-- A middle name for each parent on baptism and confirmation records. In the Philippines it is usually the
-- mother's maiden surname, and parish registers often give it, so it is kept in full rather than as an
-- initial. Optional: older entries and many registers leave it out. (Marriage parties already keep a parent
-- middle initial, as the civil form asks.)

ALTER TABLE baptism
  ADD COLUMN father_middle_name VARCHAR(100),
  ADD COLUMN mother_middle_name VARCHAR(100);

ALTER TABLE confirmation
  ADD COLUMN father_middle_name VARCHAR(100),
  ADD COLUMN mother_middle_name VARCHAR(100);
