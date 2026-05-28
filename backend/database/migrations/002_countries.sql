-- Migration 002: Countries, Application Fees, Class Applications

-- Countries (replaces regions for pricing)
CREATE TABLE IF NOT EXISTS countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code CHAR(2) NOT NULL UNIQUE,
  currency_code CHAR(3) NOT NULL,
  currency_symbol VARCHAR(5) NOT NULL,
  currency_name VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add country_id to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES countries(id) ON DELETE SET NULL;

-- Add country_id to class_pricing (alongside existing region_id)
ALTER TABLE class_pricing ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES countries(id) ON DELETE CASCADE;

-- Drop old region unique constraint and replace with country-aware one
ALTER TABLE class_pricing DROP CONSTRAINT IF EXISTS class_pricing_class_id_region_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_class_country_price ON class_pricing(class_id, country_id) WHERE country_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_class_default_price ON class_pricing(class_id) WHERE country_id IS NULL AND region_id IS NULL;

-- Application fees per country (Super Admin sets these)
CREATE TABLE IF NOT EXISTS application_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE UNIQUE,
  fee DECIMAL(10,2) NOT NULL DEFAULT 15.00,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Class applications (student-initiated)
CREATE TABLE IF NOT EXISTS class_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  country_id UUID REFERENCES countries(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  application_fee_charged DECIMAL(10,2),
  currency_code CHAR(3),
  fee_waived BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  notes TEXT,
  UNIQUE(class_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_student ON class_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_class   ON class_applications(class_id);
CREATE INDEX IF NOT EXISTS idx_applications_status  ON class_applications(status);

-- Seed countries
INSERT INTO countries (name, code, currency_code, currency_symbol, currency_name) VALUES
  ('United States', 'US', 'USD', '$',   'US Dollar'),
  ('India',         'IN', 'INR', '₹',   'Indian Rupee'),
  ('Nepal',         'NP', 'NPR', 'Rs',  'Nepalese Rupee'),
  ('China',         'CN', 'CNY', '¥',   'Chinese Yuan'),
  ('Mexico',        'MX', 'MXN', 'MX$', 'Mexican Peso')
ON CONFLICT (code) DO NOTHING;

-- Default application fees (15 in each local currency)
INSERT INTO application_fees (country_id, fee)
SELECT id, 15.00 FROM countries
ON CONFLICT (country_id) DO NOTHING;
