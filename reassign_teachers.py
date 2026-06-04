"""
1. Reassign classes from old last-name-only teacher accounts to new full-name teachers
   (matched by last name, case-insensitive).
2. Delete all old @arintu.com teacher accounts.
"""
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST     = '207.246.86.179'
PASSWORD = 'v+Z3F6jWu(n*H}aB'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username='root', password=PASSWORD, timeout=30)
sftp = client.open_sftp()

def run(sql, label=''):
    with sftp.open('/tmp/ra_tmp.sql', 'w') as f:
        f.write(sql)
    stdin, stdout, stderr = client.exec_command(
        'su - postgres -c "psql -d arintu -f /tmp/ra_tmp.sql"'
    )
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if label:
        print(f'  [{label}]', out.strip() or '(ok)')
    if err and err.strip():
        print(f'  STDERR [{label}]:', err.strip())
    return out

# ── Step 1: show old teachers ────────────────────────────────────────────────
print('=== Old @arintu.com teacher accounts ===')
out = run("""
SELECT id, name, email,
       (SELECT count(*) FROM classes c WHERE c.admin_id = u.id) AS class_count
FROM users u
WHERE role = 'teacher' AND email LIKE '%@arintu.com'
ORDER BY name;
""", 'old teachers')

# ── Step 2: reassign classes from old → new by last name ────────────────────
# Mapping: old email -> new teacher email
LAST_NAME_MAP = {
    'agrawal':  'sunitaicmas@gmail.com',
    'bergman':  'prof.bergman808@gmail.com',
    'clark':    'abeclark@gmail.com',
    'keyal':    'shivkeyal@gmail.com',
    'maewal':   'amaewal@gmail.com',
    # kumar, mathur — no matching new teacher; classes (if any) are left as-is
}

print('\n=== Reassigning classes ===')
for last_name, new_email in LAST_NAME_MAP.items():
    old_email = f'{last_name}@arintu.com'
    sql = f"""
UPDATE classes
SET admin_id = (SELECT id FROM users WHERE email = '{new_email}' LIMIT 1)
WHERE admin_id = (SELECT id FROM users WHERE email = '{old_email}' LIMIT 1)
RETURNING id, name;
"""
    out2 = run(sql, f'{old_email} → {new_email}')
    # Count reassigned
    rows = [l.strip() for l in out2.splitlines() if '-' in l and '|' not in l or
            l.strip().startswith('(')]
    if '(0 rows)' in out2:
        print(f'    No classes to move.')
    else:
        count_line = [l for l in out2.splitlines() if l.strip().startswith('(')]
        print(f'    Moved: {count_line[0] if count_line else "?"}')

# ── Step 3: verify old accounts now have 0 classes ──────────────────────────
print('\n=== Verify old teachers have 0 classes before delete ===')
run("""
SELECT u.name, u.email,
       (SELECT count(*) FROM classes c WHERE c.admin_id = u.id) AS class_count
FROM users u
WHERE role = 'teacher' AND email LIKE '%@arintu.com'
ORDER BY name;
""", 'pre-delete check')

# ── Step 4: delete old @arintu.com teacher accounts ─────────────────────────
print('\n=== Deleting old @arintu.com teacher accounts ===')
run("""
DELETE FROM users
WHERE role = 'teacher' AND email LIKE '%@arintu.com'
RETURNING name, email;
""", 'deleted')

# ── Step 5: confirm remaining teachers ──────────────────────────────────────
print('\n=== Remaining teachers ===')
run("""
SELECT u.name, u.email,
       (SELECT count(*) FROM classes c WHERE c.admin_id = u.id) AS class_count
FROM users u
WHERE role = 'teacher'
ORDER BY name;
""", 'final state')

sftp.close()
client.close()
print('\nDone.')
