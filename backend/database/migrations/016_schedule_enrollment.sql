-- 016_schedule_enrollment.sql
-- Per-schedule enrollment: which recurring schedule (session_code) the student
-- picked when they applied/enrolled. Class.max_students is now treated as the
-- per-schedule cap.

ALTER TABLE class_applications
  ADD COLUMN IF NOT EXISTS schedule_code VARCHAR(20);

ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS schedule_code VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_enrollments_class_schedule
  ON enrollments(class_id, schedule_code);
CREATE INDEX IF NOT EXISTS idx_applications_class_schedule
  ON class_applications(class_id, schedule_code);

GRANT ALL ON class_applications TO arintu;
GRANT ALL ON enrollments TO arintu;
