-- Cheque and bank transfer status (D4).
--
-- A cheque or transfer isn't money in hand until the bank clears it. Office gifts paid that way
-- start 'pending'; an admin marks them 'cleared' or 'bounced' (with a reason). Only cleared gifts
-- count in totals. Cash and GCash are cleared from the start.
--
-- reference: the cheque number or the transfer reference. bank: the cheque's bank.
-- Gifts recorded before this are taken as cleared, as they were already counted.

ALTER TABLE donation ADD COLUMN reference VARCHAR(60);
ALTER TABLE donation ADD COLUMN bank VARCHAR(80);
ALTER TABLE donation ADD COLUMN clearing_status VARCHAR(10) NOT NULL DEFAULT 'cleared'
  CHECK (clearing_status IN ('pending', 'cleared', 'bounced'));
ALTER TABLE donation ADD COLUMN clearing_changed_at TIMESTAMP;
ALTER TABLE donation ADD COLUMN clearing_changed_by UUID REFERENCES app_user(id);
ALTER TABLE donation ADD COLUMN bounce_reason TEXT;

ALTER TABLE donation ADD CONSTRAINT donation_bounce_reason
  CHECK (clearing_status <> 'bounced' OR length(trim(bounce_reason)) > 0);

CREATE INDEX donation_pending_idx ON donation (parish_id) WHERE clearing_status = 'pending';
