"""Add bio, linkedin_url, profile_photo_path, show_on_team to users table."""
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
host = '207.246.86.179'
password = 'v+Z3F6jWu(n*H}aB'
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username='root', password=password, timeout=30)
sftp = client.open_sftp()

sql = (
    "ALTER TABLE users\n"
    "  ADD COLUMN IF NOT EXISTS bio                TEXT,\n"
    "  ADD COLUMN IF NOT EXISTS linkedin_url       VARCHAR(500),\n"
    "  ADD COLUMN IF NOT EXISTS profile_photo_path VARCHAR(500),\n"
    "  ADD COLUMN IF NOT EXISTS show_on_team       BOOLEAN DEFAULT TRUE;\n"
)

with sftp.open('/tmp/migrate_teacher_profile.sql', 'w') as f:
    f.write(sql)
sftp.close()

stdin, stdout, stderr = client.exec_command(
    'su - postgres -c "psql -d arintu -f /tmp/migrate_teacher_profile.sql"'
)
print('=== stdout ===')
print(stdout.read().decode('utf-8', errors='replace'))
print('=== stderr ===')
print(stderr.read().decode('utf-8', errors='replace'))

# Verify columns exist
check_sql = (
    "SELECT column_name FROM information_schema.columns "
    "WHERE table_name='users' "
    "AND column_name IN ('bio','linkedin_url','profile_photo_path','show_on_team') "
    "ORDER BY column_name;"
)
stdin, stdout, stderr = client.exec_command(
    'su - postgres -c "psql -d arintu -c \'' + check_sql + '\'"'
)
print('=== New columns ===')
print(stdout.read().decode('utf-8', errors='replace'))

client.close()
print('Done.')
