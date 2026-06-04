"""Create gallery_items table for community photo/video uploads."""
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
host = '207.246.86.179'
password = 'v+Z3F6jWu(n*H}aB'
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username='root', password=password, timeout=30)
sftp = client.open_sftp()

sql = (
    "CREATE TABLE IF NOT EXISTS gallery_items (\n"
    "  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n"
    "  title           VARCHAR(255),\n"
    "  description     TEXT,\n"
    "  file_path       VARCHAR(500) NOT NULL,\n"
    "  original_name   VARCHAR(255),\n"
    "  file_type       VARCHAR(10)  NOT NULL CHECK (file_type IN ('photo','video')),\n"
    "  mime_type       VARCHAR(100),\n"
    "  file_size       INTEGER,\n"
    "  status          VARCHAR(20)  NOT NULL DEFAULT 'pending'\n"
    "                  CHECK (status IN ('pending','approved','rejected')),\n"
    "  uploader_name   VARCHAR(100) NOT NULL,\n"
    "  uploader_email  VARCHAR(255) NOT NULL,\n"
    "  admin_notes     TEXT,\n"
    "  reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,\n"
    "  reviewed_at     TIMESTAMPTZ,\n"
    "  created_at      TIMESTAMPTZ DEFAULT NOW()\n"
    ");\n"
    "CREATE INDEX IF NOT EXISTS idx_gallery_status   ON gallery_items(status);\n"
    "CREATE INDEX IF NOT EXISTS idx_gallery_created  ON gallery_items(created_at DESC);\n"
)

with sftp.open('/tmp/migrate_gallery.sql', 'w') as f:
    f.write(sql)
sftp.close()

stdin, stdout, stderr = client.exec_command(
    'su - postgres -c "psql -d arintu -f /tmp/migrate_gallery.sql"'
)
print(stdout.read().decode('utf-8', errors='replace'))
err = stderr.read().decode('utf-8', errors='replace')
if err: print('STDERR:', err)

# Verify
stdin, stdout, stderr = client.exec_command(
    'su - postgres -c "psql -d arintu -c \'\\d gallery_items\'"'
)
print(stdout.read().decode('utf-8', errors='replace'))

# Ensure uploads/gallery dir exists on server
stdin, stdout, stderr = client.exec_command('mkdir -p /opt/arintu/backend/uploads/gallery')
print('uploads/gallery dir:', stderr.read().decode() or 'ok')

client.close()
print('Done.')
