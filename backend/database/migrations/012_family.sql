-- 012_family.sql
-- Adds must_change_password flag for accounts created by family members

ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
