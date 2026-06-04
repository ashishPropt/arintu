-- 015_jobs.sql
-- Job postings managed by superadmin; public page shows listings or "hiring soon" fallback

CREATE TABLE IF NOT EXISTS jobs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         VARCHAR(255) NOT NULL,
  department    VARCHAR(100),
  location      VARCHAR(100),
  type          VARCHAR(50)  DEFAULT 'Full-time',
  description   TEXT,
  requirements  TEXT,
  is_active     BOOLEAN      DEFAULT TRUE,
  display_order INTEGER      DEFAULT 0,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_order     ON jobs(display_order, created_at);

GRANT ALL ON jobs TO arintu;
