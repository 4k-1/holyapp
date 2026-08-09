CREATE TYPE marriage_application_status AS ENUM ('pending', 'checking_requirements', 'approved', 'rejected', 'completed');

CREATE TABLE marriage_application (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parish(id),
  groom_first_name VARCHAR(100) NOT NULL,
  groom_middle_name VARCHAR(100),
  groom_last_name VARCHAR(100) NOT NULL,
  bride_first_name VARCHAR(100) NOT NULL,
  bride_middle_name VARCHAR(100),
  bride_last_name VARCHAR(100) NOT NULL,
  status marriage_application_status NOT NULL DEFAULT 'pending',
  remarks TEXT,
  created_by UUID NOT NULL REFERENCES app_user(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE marriage_requirement_type (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parish(id),
  requirement_name VARCHAR(255) NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES app_user(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE marriage_application_requirement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marriage_application_id UUID NOT NULL REFERENCES marriage_application(id),
  requirement_type_id UUID NOT NULL REFERENCES marriage_requirement_type(id),
  submitted BOOLEAN NOT NULL DEFAULT false,
  verified_by UUID REFERENCES app_user(id),
  verified_at TIMESTAMP
);