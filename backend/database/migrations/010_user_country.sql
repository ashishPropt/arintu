-- Migration 010: Store student's country on their user profile
-- Eliminates the need to ask for country during every class application.

ALTER TABLE users ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES countries(id);

CREATE INDEX IF NOT EXISTS idx_users_country_id ON users(country_id);

-- Backfill: if a student has at least one application, use that country
UPDATE users u
SET country_id = (
  SELECT ca.country_id
  FROM class_applications ca
  WHERE ca.student_id = u.id
    AND ca.country_id IS NOT NULL
  ORDER BY ca.applied_at ASC
  LIMIT 1
)
WHERE u.role = 'student' AND u.country_id IS NULL;

GRANT ALL ON users TO arintu;
