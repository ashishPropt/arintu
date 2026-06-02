-- 013_recordings.sql
-- Stores class session recordings saved to Vultr Object Storage via Zoom webhook

CREATE TABLE IF NOT EXISTS class_recordings (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id         UUID        REFERENCES classes(id) ON DELETE CASCADE,
  schedule_id      UUID        REFERENCES class_schedules(id) ON DELETE SET NULL,
  title            TEXT        NOT NULL,
  storage_key      TEXT        NOT NULL UNIQUE,
  recording_url    TEXT        NOT NULL,
  file_size_bytes  BIGINT,
  duration_seconds INTEGER,
  recording_type   TEXT        NOT NULL DEFAULT 'zoom',
  zoom_meeting_id  TEXT,
  recorded_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recordings_class    ON class_recordings(class_id);
CREATE INDEX IF NOT EXISTS idx_recordings_schedule ON class_recordings(schedule_id);
CREATE INDEX IF NOT EXISTS idx_recordings_recorded ON class_recordings(recorded_at DESC);
