-- TBTrack PostgreSQL Database Schema
-- Compatible with Render PostgreSQL, Supabase, Neon, AWS RDS, and local PostgreSQL

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (authentication & credentials)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'hospital' CHECK (role IN ('hospital', 'nurse', 'admin', 'viewer', 'patient')),
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'hospital' CHECK (role IN ('hospital', 'nurse', 'admin', 'viewer', 'patient')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Health Facilities
CREATE TABLE IF NOT EXISTS facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  county TEXT,
  sub_county TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  age INT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  phone TEXT,
  address TEXT,
  facility TEXT,
  tb_type TEXT CHECK (tb_type IN ('pulmonary', 'extra-pulmonary')),
  regimen TEXT,
  treatment_start DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'lost', 'died')),
  mdr_flag BOOLEAN NOT NULL DEFAULT FALSE,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  registered_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS patients_user_id_idx ON patients(user_id);
CREATE INDEX IF NOT EXISTS patients_status_idx ON patients(status);

-- Daily Dose Logs
CREATE TABLE IF NOT EXISTS dose_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  taken BOOLEAN NOT NULL,
  notes TEXT,
  logged_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (patient_id, date)
);

CREATE INDEX IF NOT EXISTS dose_logs_patient_date_idx ON dose_logs(patient_id, date);

-- Lab Results
CREATE TABLE IF NOT EXISTS lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL CHECK (test_type IN ('sputum_smear', 'genexpert', 'xray', 'culture')),
  result TEXT NOT NULL CHECK (result IN ('positive', 'negative', 'pending')),
  result_date DATE NOT NULL,
  lab_ref TEXT,
  notes TEXT,
  mdr_detected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lab_results_patient_idx ON lab_results(patient_id);

-- Contact Tracing
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INT,
  relationship TEXT CHECK (relationship IN ('spouse', 'child', 'parent', 'roommate', 'other')),
  phone TEXT,
  screened BOOLEAN NOT NULL DEFAULT FALSE,
  screen_result TEXT CHECK (screen_result IS NULL OR screen_result IN ('negative', 'referred', 'confirmed_tb')),
  screened_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contacts_source_patient_idx ON contacts(source_patient_id);
