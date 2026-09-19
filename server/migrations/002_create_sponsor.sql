CREATE TABLE sponsor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  sex VARCHAR(10),
  date_of_birth DATE,
  contact_number VARCHAR(50),
  address VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Polymorphic: links a sponsor to a baptism, confirmation, or marriage record
CREATE TABLE sacrament_sponsor_assignment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES sponsor(id),
  sacrament_type VARCHAR(50) NOT NULL,   -- 'baptism', 'confirmation', 'marriage'
  sacrament_record_id UUID NOT NULL,
  role VARCHAR(50),                       -- e.g. ninong, ninang, principal sponsor
  relationship_to_recipient VARCHAR(100), -- kept from original godparent table
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_signed BOOLEAN NOT NULL DEFAULT false, -- covers marriage form's "Sgd" column
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);