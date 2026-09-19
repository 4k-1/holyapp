CREATE TYPE civil_status AS ENUM ('single', 'widowed', 'divorced', 'annulled');
CREATE TYPE legitimacy_status AS ENUM ('legitimate', 'illegitimate');
CREATE TYPE marriage_party_role AS ENUM ('husband', 'wife');
 

CREATE TABLE baptism (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parish(id),
 
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  sex VARCHAR(10),
 
  date_of_birth DATE NOT NULL,
  place_of_birth VARCHAR(255),
 
  date_of_baptism DATE NOT NULL,
  place_of_baptism VARCHAR(255) NOT NULL,
 
  status legitimacy_status,
  address VARCHAR(255),
 
  minister VARCHAR(255) NOT NULL,
 
  -- Parents (split, matches scanned form: Pa Last/First, Ma Last/First)
  father_last_name VARCHAR(100) NOT NULL,
  father_first_name VARCHAR(100) NOT NULL,
  mother_last_name VARCHAR(100) NOT NULL,
  mother_first_name VARCHAR(100) NOT NULL,
 
  -- Grandparents (kept whole per original data dictionary; flag to confirm with admin)
  paternal_grandfather VARCHAR(255) NOT NULL,
  paternal_grandmother VARCHAR(255) NOT NULL,
  maternal_grandfather VARCHAR(255) NOT NULL,
  maternal_grandmother VARCHAR(255) NOT NULL,
 
  with_marriage_certificate BOOLEAN NOT NULL DEFAULT false,
  with_birth_certificate BOOLEAN NOT NULL DEFAULT false,
 
  book_number VARCHAR(20) NOT NULL,
  page_number VARCHAR(20) NOT NULL,
  entry_number VARCHAR(20) NOT NULL,
  remarks TEXT,
 
  encoded_by UUID NOT NULL REFERENCES app_user(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
 

CREATE TABLE confirmation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parish(id),
 
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  sex VARCHAR(10),
 
  date_of_birth DATE,
  address VARCHAR(255),
 
  -- Parents (split, matches scanned form: Pa Last/First, Ma Last/First)
  father_last_name VARCHAR(100),
  father_first_name VARCHAR(100),
  mother_last_name VARCHAR(100),
  mother_first_name VARCHAR(100),
 
  date_of_confirmation DATE NOT NULL,
  place_of_confirmation VARCHAR(255) NOT NULL,
  minister VARCHAR(255) NOT NULL,
 
  baptismal_record_id UUID REFERENCES baptism(id),
  baptism_date DATE,
  baptism_place VARCHAR(255),
 
  is_prior_marriage BOOLEAN NOT NULL DEFAULT false,
  is_adult BOOLEAN NOT NULL DEFAULT false,
 
  book_number VARCHAR(20) NOT NULL,
  page_number VARCHAR(20) NOT NULL,
  entry_number VARCHAR(20) NOT NULL,
  remarks TEXT,
 
  encoded_by UUID NOT NULL REFERENCES app_user(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
 

-- MARRIAGE (normalized: marriage + marriage_party + marriage_consent_person)

CREATE TABLE marriage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parish(id),
 
  place_of_marriage VARCHAR(255) NOT NULL,
  marriage_address VARCHAR(255),
  date_of_marriage DATE NOT NULL,
  time_of_marriage TIME,
 
  witness_one VARCHAR(255) NOT NULL,
  witness_two VARCHAR(255) NOT NULL,
 
  book_number VARCHAR(20) NOT NULL,
  page_number VARCHAR(20) NOT NULL,
  entry_number VARCHAR(20) NOT NULL,
  remarks TEXT,
 
  encoded_by UUID NOT NULL REFERENCES app_user(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
 
CREATE TABLE marriage_party (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marriage_id UUID NOT NULL REFERENCES marriage(id),
  role marriage_party_role NOT NULL,
 
  last_name VARCHAR(100) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
 
  date_of_birth DATE NOT NULL,
  birthplace VARCHAR(255),
  sex VARCHAR(10),
  citizenship VARCHAR(100),
  address VARCHAR(255),
  religion VARCHAR(100),
  civil_status civil_status,
 
  baptismal_record_id UUID REFERENCES baptism(id),
 
  father_last_name VARCHAR(100),
  father_first_name VARCHAR(100),
  father_middle_initial VARCHAR(5),
  father_citizenship VARCHAR(100),
 
  mother_last_name VARCHAR(100),
  mother_first_name VARCHAR(100),
  mother_middle_initial VARCHAR(5),
  mother_citizenship VARCHAR(100),
 
  UNIQUE (marriage_id, role)
);
 
CREATE TABLE marriage_consent_person (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marriage_party_id UUID NOT NULL REFERENCES marriage_party(id),
 
  last_name VARCHAR(100),
  first_name VARCHAR(100),
  middle_initial VARCHAR(5),
  relation VARCHAR(100),
  residence VARCHAR(255)
);
 

-- DEATH (+ death_kin, death_sacrament_received)

CREATE TABLE death (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parish(id),
 
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  residence VARCHAR(255),
 
  age INT,
  age_months INT,
  age_days INT,
  status VARCHAR(50),
 
  date_of_death DATE NOT NULL,
  date_of_burial DATE NOT NULL,
  place_of_burial VARCHAR(255) NOT NULL,
  niche_number VARCHAR(20),
  niche_type VARCHAR(50),
 
  minister VARCHAR(255) NOT NULL,
  cause_of_death VARCHAR(255),
 
  book_number VARCHAR(20) NOT NULL,
  page_number VARCHAR(20) NOT NULL,
  entry_number VARCHAR(20) NOT NULL,
  remarks TEXT,
 
  encoded_by UUID NOT NULL REFERENCES app_user(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
 
CREATE TABLE death_kin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  death_id UUID NOT NULL REFERENCES death(id),
  relation_to_deceased VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  first_name VARCHAR(100)
);
 
CREATE TABLE death_sacrament_received (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  death_id UUID NOT NULL REFERENCES death(id),
  sacrament_name VARCHAR(50) NOT NULL -- 'last_rites', 'burial_mass', 'confession', 'communion'
);