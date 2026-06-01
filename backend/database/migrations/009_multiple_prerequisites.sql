-- Migration 009: Multiple prerequisites per class (junction table)
-- Previously classes had a single prerequisite_class_id column.
-- Now any number of prerequisite classes can be linked via this table.

CREATE TABLE IF NOT EXISTS class_prerequisites (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id             UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  prerequisite_class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (class_id, prerequisite_class_id),
  CHECK  (class_id != prerequisite_class_id)
);

CREATE INDEX IF NOT EXISTS idx_class_prereqs_class_id
  ON class_prerequisites(class_id);
CREATE INDEX IF NOT EXISTS idx_class_prereqs_prereq_id
  ON class_prerequisites(prerequisite_class_id);

-- Migrate any existing single prerequisites from the old column
INSERT INTO class_prerequisites (class_id, prerequisite_class_id)
SELECT id, prerequisite_class_id
  FROM classes
 WHERE prerequisite_class_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Grants
GRANT ALL ON class_prerequisites TO arintu;
