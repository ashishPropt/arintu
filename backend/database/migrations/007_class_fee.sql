-- Migration 007: Two-phase enrollment — separate application fee from class tuition fee

-- ── class_applications additions ─────────────────────────────────────────────

-- Track class (tuition) fee separately from the one-time application fee
ALTER TABLE class_applications ADD COLUMN IF NOT EXISTS class_fee_status VARCHAR(30) DEFAULT 'pending';
ALTER TABLE class_applications ADD COLUMN IF NOT EXISTS class_fee_amount   DECIMAL(10,2);
ALTER TABLE class_applications ADD COLUMN IF NOT EXISTS class_fee_stripe_session_id VARCHAR(255);
ALTER TABLE class_applications ADD COLUMN IF NOT EXISTS class_fee_payment_intent    VARCHAR(255);
ALTER TABLE class_applications ADD COLUMN IF NOT EXISTS class_fee_paid_at  TIMESTAMPTZ;

-- Scholarship reason (student submits when requesting)
ALTER TABLE class_applications ADD COLUMN IF NOT EXISTS scholarship_reason TEXT;

-- Constraint for class_fee_status
ALTER TABLE class_applications DROP CONSTRAINT IF EXISTS ca_class_fee_status_check;
ALTER TABLE class_applications ADD CONSTRAINT ca_class_fee_status_check
  CHECK (class_fee_status IN (
    'pending',            -- waiting for app fee to be settled first
    'pending_payment',    -- ready to pay class fee (app fee done)
    'scholarship_pending',-- student requested scholarship, waiting for admin decision
    'paid',               -- class fee paid → fully enrolled
    'full_scholarship',   -- full scholarship awarded → auto-enrolled
    'not_required'        -- class has no price, or fee otherwise not applicable
  ));

-- Allow scholarship_type to have 'pending' state (requested but not yet reviewed by admin)
ALTER TABLE class_applications DROP CONSTRAINT IF EXISTS class_applications_scholarship_type_check;
ALTER TABLE class_applications ADD CONSTRAINT class_applications_scholarship_type_check
  CHECK (scholarship_type IN ('none', 'partial', 'full', 'pending'));

-- ── Backfill existing rows ─────────────────────────────────────────────────────
-- Approved applications already have their class fee settled
UPDATE class_applications SET class_fee_status = 'paid'
WHERE status = 'approved' AND class_fee_status = 'pending';

-- Applications where app fee was paid/waived but admin hasn't approved yet
UPDATE class_applications SET class_fee_status = 'pending_payment'
WHERE status = 'pending'
  AND payment_status IN ('paid', 'waived')
  AND class_fee_status = 'pending';
