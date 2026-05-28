-- Stripe payment tracking columns on class_applications
ALTER TABLE class_applications
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30)
    CHECK (payment_status IN ('pending_payment', 'paid', 'waived', 'stripe_pending', 'failed', 'refunded'));

ALTER TABLE class_applications
  ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(200);

ALTER TABLE class_applications
  ADD COLUMN IF NOT EXISTS stripe_payment_intent VARCHAR(200);

ALTER TABLE class_applications
  ADD COLUMN IF NOT EXISTS payment_completed_at TIMESTAMPTZ;

-- Back-fill: treat all pre-Stripe applications as paid/waived (they were created before Stripe existed)
UPDATE class_applications
SET payment_status = CASE
  WHEN fee_waived = TRUE THEN 'waived'
  ELSE 'paid'
END
WHERE payment_status IS NULL;
