
CREATE TYPE personnel_status AS ENUM ('active', 'inactive');

CREATE TABLE parish_personnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parish(id),
  full_name VARCHAR(255) NOT NULL,
  role_title VARCHAR(100) NOT NULL,
  contact_info VARCHAR(255),
  user_id UUID REFERENCES app_user(id), -- nullable: only set if this person also has system access
  status personnel_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE app_user ADD COLUMN first_name VARCHAR(100);
ALTER TABLE app_user ADD COLUMN middle_name VARCHAR(100);
ALTER TABLE app_user ADD COLUMN last_name VARCHAR(100);


ALTER TABLE app_user DROP COLUMN full_name;


DROP TABLE parishioner_record;


ALTER TABLE certificate_request DROP COLUMN IF EXISTS parishioner_id;

DROP TABLE parishioner;

ALTER TABLE baptism ALTER COLUMN paternal_grandfather DROP NOT NULL;
ALTER TABLE baptism ALTER COLUMN paternal_grandmother DROP NOT NULL;
ALTER TABLE baptism ALTER COLUMN maternal_grandfather DROP NOT NULL;
ALTER TABLE baptism ALTER COLUMN maternal_grandmother DROP NOT NULL;


ALTER TYPE cert_request_status ADD VALUE IF NOT EXISTS 'awaiting_payment' AFTER 'pending';
ALTER TYPE cert_request_status ADD VALUE IF NOT EXISTS 'ready' AFTER 'processing';

ALTER TABLE donation ADD COLUMN user_id UUID REFERENCES app_user(id);


ALTER TABLE event ADD COLUMN assigned_to UUID REFERENCES parish_personnel(id);


ALTER TABLE payment ALTER COLUMN certificate_request_id DROP NOT NULL;
ALTER TABLE payment ADD COLUMN donation_id UUID REFERENCES donation(id);
ALTER TABLE payment ADD COLUMN mass_intention_id UUID REFERENCES mass_intention(id);

ALTER TABLE payment ADD CONSTRAINT payment_exactly_one_source CHECK (
  (CASE WHEN certificate_request_id IS NOT NULL THEN 1 ELSE 0 END) +
  (CASE WHEN donation_id IS NOT NULL THEN 1 ELSE 0 END) +
  (CASE WHEN mass_intention_id IS NOT NULL THEN 1 ELSE 0 END) = 1
);