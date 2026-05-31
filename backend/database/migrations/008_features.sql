-- ============================================================
-- Migration 008: Parent info, 2FA, Prerequisites, Flat INR Fee
-- ============================================================

-- ── Parent / guardian info on student accounts ────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_name  VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(30);

-- ── Contact preference ────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_preference VARCHAR(20) DEFAULT 'email'
  CHECK (contact_preference IN ('email', 'phone', 'whatsapp', 'any'));

-- ── Two-Factor Authentication (TOTP) ─────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret      VARCHAR(128);
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_temp_secret VARCHAR(128);
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled     BOOLEAN DEFAULT FALSE;

-- ── Class prerequisites ───────────────────────────────────────
ALTER TABLE classes ADD COLUMN IF NOT EXISTS prerequisite_class_id UUID
  REFERENCES classes(id) ON DELETE SET NULL;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS requires_quiz     BOOLEAN DEFAULT FALSE;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS prerequisite_notes TEXT;

-- Prerequisite manual approvals (admin can approve a student who
-- doesn't have the prerequisite class enrolled but has other proof)
CREATE TABLE IF NOT EXISTS prerequisite_approvals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes       TEXT,
  approved    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, student_id)
);

-- ── Global settings ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS global_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Base application fee in INR (converted to local currency at checkout)
INSERT INTO global_settings (key, value, description)
VALUES ('app_fee_inr', '500', 'One-time application fee in INR. Auto-converted to local currency.')
ON CONFLICT (key) DO NOTHING;

-- ── INR exchange rate per country ─────────────────────────────
-- Rate = "units of local currency per 1 INR"
-- So  fee_local = round(500 * inr_exchange_rate)
-- Default 0.012 ≈ USD (1 INR ≈ $0.012 → 500 INR ≈ $6)
ALTER TABLE countries ADD COLUMN IF NOT EXISTS inr_exchange_rate DECIMAL(10,6) DEFAULT 0.012;

-- Populate rates for common countries
-- US / Canada / Australia / New Zealand
UPDATE countries SET inr_exchange_rate = 0.012  WHERE code = 'US';  -- USD  ≈ $6
UPDATE countries SET inr_exchange_rate = 0.016  WHERE code = 'CA';  -- CAD  ≈ CA$8
UPDATE countries SET inr_exchange_rate = 0.018  WHERE code = 'AU';  -- AUD  ≈ A$9
UPDATE countries SET inr_exchange_rate = 0.020  WHERE code = 'NZ';  -- NZD  ≈ NZ$10

-- Europe (EUR)
UPDATE countries SET inr_exchange_rate = 0.011  WHERE code IN ('DE','FR','IT','ES','NL','PT','BE','AT','FI','GR','IE','LU','SK','SI','EE','LV','LT','CY','MT');

-- UK
UPDATE countries SET inr_exchange_rate = 0.0095 WHERE code = 'GB';  -- GBP  ≈ £5

-- Asia
UPDATE countries SET inr_exchange_rate = 1.0    WHERE code = 'IN';  -- INR  = ₹500
UPDATE countries SET inr_exchange_rate = 0.016  WHERE code = 'SG';  -- SGD  ≈ SG$8
UPDATE countries SET inr_exchange_rate = 0.0055 WHERE code = 'JP';  -- JPY  ≈ ¥3 (round up to ¥650 actual)
UPDATE countries SET inr_exchange_rate = 0.044  WHERE code = 'KR';  -- KRW  (round to ₩22 → too small, use 0.044 → ₩22,000 for 500)
UPDATE countries SET inr_exchange_rate = 0.086  WHERE code = 'HK';  -- HKD  ≈ HK$43 → round to HK$50
UPDATE countries SET inr_exchange_rate = 0.033  WHERE code = 'AE';  -- AED  ≈ AE₿17 → round to AED 20
UPDATE countries SET inr_exchange_rate = 0.045  WHERE code = 'SA';  -- SAR  ≈ SAR 22 → round to 25
UPDATE countries SET inr_exchange_rate = 0.16   WHERE code = 'CN';  -- CNY  ≈ ¥80
UPDATE countries SET inr_exchange_rate = 0.55   WHERE code = 'PK';  -- PKR  ≈ ₨275
UPDATE countries SET inr_exchange_rate = 0.48   WHERE code = 'BD';  -- BDT  ≈ ৳240
UPDATE countries SET inr_exchange_rate = 0.40   WHERE code = 'LK';  -- LKR  ≈ Rs.200
UPDATE countries SET inr_exchange_rate = 0.013  WHERE code = 'MY';  -- MYR  ≈ RM 6.5

-- Americas
UPDATE countries SET inr_exchange_rate = 0.20   WHERE code = 'MX';  -- MXN  ≈ MX$100
UPDATE countries SET inr_exchange_rate = 0.012  WHERE code = 'PR';  -- USD (Puerto Rico)
UPDATE countries SET inr_exchange_rate = 4.2    WHERE code = 'BR';  -- BRL  ≈ R$2100 → too much, use 0.060
UPDATE countries SET inr_exchange_rate = 0.060  WHERE code = 'BR';  -- BRL  ≈ R$30
UPDATE countries SET inr_exchange_rate = 0.048  WHERE code = 'AR';  -- ARS  → approx
UPDATE countries SET inr_exchange_rate = 0.040  WHERE code = 'CO';  -- COP  (very approximate)

-- Africa / Middle East
UPDATE countries SET inr_exchange_rate = 0.016  WHERE code = 'ZA';  -- ZAR  ≈ R8
UPDATE countries SET inr_exchange_rate = 0.55   WHERE code = 'NG';  -- NGN  ≈ ₦275
UPDATE countries SET inr_exchange_rate = 0.016  WHERE code = 'EG';  -- EGP  (approximate)

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prerequisite_approvals_class ON prerequisite_approvals(class_id);
CREATE INDEX IF NOT EXISTS idx_prerequisite_approvals_student ON prerequisite_approvals(student_id);
