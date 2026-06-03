-- 014_session_teacher.sql
-- Adds a course code to classes and per-session teacher + session code to class_schedules

-- Course code (W101, T102, M103, etc.)
ALTER TABLE classes ADD COLUMN IF NOT EXISTS code VARCHAR(20);
CREATE UNIQUE INDEX IF NOT EXISTS idx_classes_code ON classes(code) WHERE code IS NOT NULL;

-- Session code (W1011, W1021, etc.) and per-session teacher
ALTER TABLE class_schedules ADD COLUMN IF NOT EXISTS session_code VARCHAR(20);
ALTER TABLE class_schedules ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_schedules_teacher      ON class_schedules(teacher_id);
CREATE INDEX IF NOT EXISTS idx_schedules_session_code ON class_schedules(session_code);
