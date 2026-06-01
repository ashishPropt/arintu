-- Add server-side file storage columns to lessons
-- file_url stays for external links; file_path is set when a file is uploaded to the server

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS file_path VARCHAR(500),
  ADD COLUMN IF NOT EXISTS file_size BIGINT;

GRANT ALL ON lessons TO arintu;
