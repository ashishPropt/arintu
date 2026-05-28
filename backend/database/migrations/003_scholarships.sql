-- Fee waiver tracking on users (students only)
ALTER TABLE users ADD COLUMN IF NOT EXISTS fee_waiver_status VARCHAR(20)
  CHECK (fee_waiver_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS fee_waiver_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fee_waiver_notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fee_waiver_reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fee_waiver_reviewed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fee_waiver_requested_at TIMESTAMPTZ;

-- Scholarship slots per class (20% of capacity by default)
ALTER TABLE classes ADD COLUMN IF NOT EXISTS scholarship_slots INT DEFAULT 0;
UPDATE classes
SET scholarship_slots = GREATEST(1, FLOOR(max_students * 0.2)::INT)
WHERE scholarship_slots = 0 OR scholarship_slots IS NULL;

-- Scholarship tracking on applications
ALTER TABLE class_applications ADD COLUMN IF NOT EXISTS scholarship_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE class_applications ADD COLUMN IF NOT EXISTS scholarship_type VARCHAR(20) DEFAULT 'none'
  CHECK (scholarship_type IN ('none', 'partial', 'full'));
ALTER TABLE class_applications ADD COLUMN IF NOT EXISTS scholarship_discount_pct DECIMAL(5,2);
ALTER TABLE class_applications ADD COLUMN IF NOT EXISTS scholarship_reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE class_applications ADD COLUMN IF NOT EXISTS scholarship_reviewed_at TIMESTAMPTZ;
