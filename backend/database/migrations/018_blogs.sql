-- 018_blogs.sql
-- Blog posts authored by superadmins.

CREATE TABLE IF NOT EXISTS blogs (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          VARCHAR(220) NOT NULL UNIQUE,
  title         VARCHAR(255) NOT NULL,
  subtitle      VARCHAR(500),
  author_name   VARCHAR(120),
  author_role   VARCHAR(200),
  hero_image    VARCHAR(500),         -- path under uploads/blog-hero/ or external URL
  excerpt       TEXT,                 -- short summary for the index card
  content       TEXT NOT NULL,        -- markdown body
  tags          TEXT[],
  published     BOOLEAN      DEFAULT TRUE,
  published_at  TIMESTAMPTZ  DEFAULT NOW(),
  view_count    INTEGER      DEFAULT 0,
  created_by    UUID         REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blogs_published    ON blogs(published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blogs_slug         ON blogs(slug);

GRANT ALL ON blogs TO arintu;
