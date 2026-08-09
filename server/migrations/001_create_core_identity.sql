CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('super_admin', 'parish_admin', 'parish_staff', 'parishioner');
CREATE TYPE user_status AS ENUM ('active', 'suspended');

CREATE TABLE parish (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address VARCHAR(255) NOT NULL,
  contact VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  seal_url VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE app_user ( -- gi app_user nako kay naay build in function ang postgres nga user
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID REFERENCES parish(id),
  role user_role NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  contact_number VARCHAR(50),
  status user_status NOT NULL DEFAULT 'active',
  email_verified_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE parishioner (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES app_user(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);