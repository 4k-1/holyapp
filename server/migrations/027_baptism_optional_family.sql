-- Baptism entries only have to hold what the Code of Canon Law asks a baptismal register
-- to record (can. 877): the person, minister, parents, sponsors, place and date of baptism,
-- and date and place of birth. Real registers often lack the rest, so these become optional:
--
--   middle_name     old registers give only an initial, and a child recognised by the mother
--                   alone carries her surname with no middle name
--   father_*        can. 877 §2: for a child of an unmarried mother, the father is entered only
--                   if a public document or his own declaration proves paternity
--   mother_*        can. 877 §2: the mother is entered if her maternity is publicly known or she
--                   asks; a foundling has neither parent recorded
--   grandparents    not asked for by can. 877; many register books have no column for them
--
-- The API still requires a remark when both parents are blank (e.g. a foundling: when, where
-- and by whom the child was found).
ALTER TABLE baptism ALTER COLUMN middle_name DROP NOT NULL;
ALTER TABLE baptism ALTER COLUMN father_first_name DROP NOT NULL;
ALTER TABLE baptism ALTER COLUMN father_last_name DROP NOT NULL;
ALTER TABLE baptism ALTER COLUMN mother_first_name DROP NOT NULL;
ALTER TABLE baptism ALTER COLUMN mother_last_name DROP NOT NULL;
ALTER TABLE baptism ALTER COLUMN paternal_grandfather DROP NOT NULL;
ALTER TABLE baptism ALTER COLUMN paternal_grandmother DROP NOT NULL;
ALTER TABLE baptism ALTER COLUMN maternal_grandfather DROP NOT NULL;
ALTER TABLE baptism ALTER COLUMN maternal_grandmother DROP NOT NULL;
