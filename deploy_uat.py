import paramiko, sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

host = '207.246.86.179'
password = 'v+Z3F6jWu(n*H}aB'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username='root', password=password, timeout=30)
sftp = client.open_sftp()

def upload_dir(sftp, local_path, remote_path):
    try:
        sftp.mkdir(remote_path)
    except Exception:
        pass
    for item in os.listdir(local_path):
        li = os.path.join(local_path, item)
        ri = remote_path + '/' + item
        if os.path.isdir(li):
            upload_dir(sftp, li, ri)
        else:
            sftp.put(li, ri)

# Upload changed backend files
backend_files = ['routes/public.js', 'routes/content.js', 'routes/applications.js',
                 'routes/gallery.js', 'server.js']
for f in backend_files:
    local = os.path.join(r'C:\Users\amath\arintu\backend', f.replace('/', os.sep))
    remote = '/opt/arintu/backend/' + f
    sftp.put(local, remote)
    print('  backend uploaded: ' + f)

# Upload frontend dist (overwrite in place)
upload_dir(sftp, r'C:\Users\amath\arintu\frontend\dist', '/opt/arintu/frontend/dist')
print('  frontend dist uploaded')

# Restart backend and reload nginx
for cmd in ['pm2 restart arintu-api --update-env', 'systemctl reload nginx']:
    stdin, stdout, stderr = client.exec_command(cmd)
    exit_code = stdout.channel.recv_exit_status()
    print('  ' + cmd + ' -> exit=' + str(exit_code))

sftp.close()
client.close()
print('Deploy complete')
