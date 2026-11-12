-- 5b: banns as a parish step.
--
-- 1. Each marriage application keeps its banns: where each party lives, the three Sundays, which have
--    been announced, certificates received from other parishes, and a waiver by the bishop.
-- 2. A couple marrying in another parish who need their banns announced here is kept as a marriage
--    application with wedding_elsewhere set, the wedding parish named, and no requirements checklist.

ALTER TABLE marriage_application
  ADD COLUMN banns JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN wedding_elsewhere BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN wedding_parish VARCHAR(255);
