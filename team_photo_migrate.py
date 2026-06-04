import paramiko, sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

host = '207.246.86.179'
password = 'v+Z3F6jWu(n*H}aB'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username='root', password=password, timeout=30)

# Write migration SQL
sql = (
    "ALTER TABLE team_members ADD COLUMN IF NOT EXISTS photo_uploaded_path TEXT;\n"
    "ALTER TABLE team_members ADD COLUMN IF NOT EXISTS photo_source VARCHAR(10) "
    "NOT NULL DEFAULT 'url' CHECK (photo_source IN ('url', 'upload'));\n"
)

sftp = client.open_sftp()
with sftp.open('/tmp/team_photo_migration.sql', 'w') as f:
    f.write(sql)

# Upload changed backend files
backend_files = [
    'routes/content.js',
    'routes/public.js',
]
for f in backend_files:
    local = os.path.join(r'C:\Users\amath\arintu\backend', f.replace('/', os.sep))
    remote = '/opt/arintu/backend/' + f
    sftp.put(local, remote)
    print('  backend uploaded: ' + f)

sftp.close()

# Run migration
stdin, stdout, stderr = client.exec_command(
    'su - postgres -c "psql -d arintu -f /tmp/team_photo_migration.sql"'
)
exit_code = stdout.channel.recv_exit_status()
print('migration exit:', exit_code)
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))

# Restart backend
stdin, stdout, stderr = client.exec_command('pm2 restart arintu-api --update-env')
exit_code = stdout.channel.recv_exit_status()
print('pm2 restart exit:', exit_code)

client.close()
print('Done')
