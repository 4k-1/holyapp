CREATE TYPE payment_type AS ENUM ('gcash', 'cash');
CREATE TYPE payment_status AS ENUM ('paid', 'unpaid');

CREATE TABLE payment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_request_id UUID NOT NULL REFERENCES certificate_request(id),
  payment_type payment_type NOT NULL,
  amount_due DECIMAL(10,2) NOT NULL,
  amount_tendered DECIMAL(10,2),
  change DECIMAL(10,2),
  status payment_status NOT NULL DEFAULT 'unpaid',
  paymongo_reference VARCHAR(255),
  collected_by UUID REFERENCES app_user(id),
  paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE donation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parish(id),
  donor_name VARCHAR(255),
  donation_type VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  donation_date DATE NOT NULL,
  purpose VARCHAR(255),
  remarks TEXT,
  recorded_by UUID NOT NULL REFERENCES app_user(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE service_fee (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parish(id),
  service_name VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  updated_by UUID NOT NULL REFERENCES app_user(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parish(id),
  payment_method payment_type NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID NOT NULL REFERENCES app_user(id),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);