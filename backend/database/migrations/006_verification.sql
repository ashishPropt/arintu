-- Migration 006: ID verification, parent role, pending approval, enrollment deadlines, worksheets

-- ── 1. Update role check to include 'parent' ──────────────────────────────────
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('superadmin', 'admin', 'teacher', 'student', 'parent'));

-- ── 2. Account approval status (admin/teacher pending approval flow) ──────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'active';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_status_check;
ALTER TABLE users ADD CONSTRAINT users_account_status_check
  CHECK (account_status IN ('active', 'pending', 'rejected'));

-- ── 3. Student ID verification fields ─────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20);
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_verification_status_check;
ALTER TABLE users ADD CONSTRAINT users_verification_status_check
  CHECK (verification_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS id_document_path VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_document_uploaded_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_reviewed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- ── 4. Parent account linking ──────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- ── 5. Enrollment deadline + late enrollment on classes ────────────────────────
ALTER TABLE classes ADD COLUMN IF NOT EXISTS enrollment_deadline TIMESTAMPTZ;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS allow_late_enrollment BOOLEAN DEFAULT FALSE;

-- ── 6. Password reset tokens table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       VARCHAR(255) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user  ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token);

-- ── 7. Worksheets / quizzes / assignments ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS worksheets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  file_path   VARCHAR(500),
  file_name   VARCHAR(255),
  file_size   INTEGER,
  type        VARCHAR(20) DEFAULT 'worksheet'
                CHECK (type IN ('worksheet', 'quiz', 'assignment')),
  due_date    TIMESTAMPTZ,
  is_published BOOLEAN DEFAULT FALSE,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_worksheets_class ON worksheets(class_id);

-- ── 8. Back-fill existing rows ─────────────────────────────────────────────────
-- All pre-existing users get active account_status
UPDATE users SET account_status = 'active' WHERE account_status IS NULL;
