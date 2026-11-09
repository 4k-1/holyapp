-- C11: remind staff to record each sacrament in the register.
--
-- 1. A register entry keeps the schedule event it was recorded from. A baptism or confirmation
--    session is a batch, so many entries can point at one event.
-- 2. Sacrament events still to come are marked Pending (needs recording). Past ones are left as they
--    are, so old events don't flood the list.

ALTER TABLE baptism ADD COLUMN schedule_event_id UUID REFERENCES event(id) ON DELETE SET NULL;
ALTER TABLE confirmation ADD COLUMN schedule_event_id UUID REFERENCES event(id) ON DELETE SET NULL;
ALTER TABLE marriage ADD COLUMN schedule_event_id UUID REFERENCES event(id) ON DELETE SET NULL;
ALTER TABLE death ADD COLUMN schedule_event_id UUID REFERENCES event(id) ON DELETE SET NULL;

CREATE INDEX baptism_schedule_event_idx ON baptism (schedule_event_id) WHERE schedule_event_id IS NOT NULL;
CREATE INDEX confirmation_schedule_event_idx ON confirmation (schedule_event_id) WHERE schedule_event_id IS NOT NULL;
CREATE INDEX marriage_schedule_event_idx ON marriage (schedule_event_id) WHERE schedule_event_id IS NOT NULL;
CREATE INDEX death_schedule_event_idx ON death (schedule_event_id) WHERE schedule_event_id IS NOT NULL;

-- Event times are Philippine wall-clock times.
UPDATE event
SET record_status = 'Pending'
WHERE record_status IS NULL
  AND event_type IN ('baptism', 'confirmation', 'wedding', 'funeral')
  AND status <> 'cancelled'
  AND start_datetime >= (NOW() AT TIME ZONE 'Asia/Manila');
