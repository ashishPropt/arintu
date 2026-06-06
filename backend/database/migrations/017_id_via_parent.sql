-- 017_id_via_parent.sql
-- Minors who don't have a government-issued ID can be verified through
-- their parent's already-verified ID. Sets a flag on the student so the
-- admin can audit how each student was verified.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS id_waived_via_parent BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_id_waived_via_parent
  ON users(id_waived_via_parent) WHERE id_waived_via_parent = TRUE;

GRANT ALL ON users TO arintu;
