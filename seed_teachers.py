"""
Seed teachers from Courses Brief etc.docx.
- Creates teacher accounts if they don't exist (must_change_password=True)
- Updates bio, show_on_team, uploads profile photos
- Creates classes that don't exist; skips existing ones
- Assigns each teacher to their classes via admin_id
"""
import paramiko, sys, os, zipfile, time, io
import bcrypt

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# ── connection ──────────────────────────────────────────────────────────────
HOST     = '207.246.86.179'
PASSWORD = 'v+Z3F6jWu(n*H}aB'
DOCX     = r'C:\Users\amath\Downloads\Courses Brief etc.docx'
TEMP_PWD = 'ArintuTeach2025!'   # teachers must change on first login

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username='root', password=PASSWORD, timeout=30)
sftp = client.open_sftp()
print('Connected.')

# ── helpers ──────────────────────────────────────────────────────────────────
def run(sql_str, label=''):
    """Write SQL to /tmp/seed_tmp.sql and execute via psql."""
    with sftp.open('/tmp/seed_tmp.sql', 'w') as f:
        f.write(sql_str)
    stdin, stdout, stderr = client.exec_command(
        'su - postgres -c "psql -d arintu -f /tmp/seed_tmp.sql"'
    )
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if label:
        print(f'  [{label}]', out.strip() or '(ok)')
    if err and err.strip():
        print(f'  STDERR [{label}]:', err.strip())
    return out

def query_one(sql_str):
    """Run a SELECT and return the single output line (stripped)."""
    out = run(sql_str)
    lines = [l.strip() for l in out.splitlines() if l.strip() and not l.startswith('-') and not l.startswith('(')]
    return lines[1] if len(lines) > 1 else (lines[0] if lines else '')

# ── extract images from docx ─────────────────────────────────────────────────
IMAGE_MAP = {
    'abeclark@gmail.com':       ('word/media/image3.jpg', '.jpg'),
    'prof.bergman808@gmail.com': ('word/media/image1.jpg', '.jpg'),
    'sunitaicmas@gmail.com':    ('word/media/image2.png', '.png'),
    'shivkeyal@gmail.com':      ('word/media/image4.png', '.png'),
    # amaewal@gmail.com — no photo in document
}

images = {}  # email -> bytes
with zipfile.ZipFile(DOCX) as z:
    for email, (src, ext) in IMAGE_MAP.items():
        images[email] = (z.read(src), ext)
        print(f'  Loaded image for {email} ({src})')

# ── teacher data ──────────────────────────────────────────────────────────────
TEACHERS = [
    {
        'email': 'abeclark@gmail.com',
        'name':  'Abe Clark',
        'bio': (
            'Creative writing instructor specializing in high school students (grades 9–12). '
            'Teaches writing that uses imagination, originality, and artistic expression — '
            'including fiction, poetry, drama/screenwriting, and creative nonfiction. '
            'Focuses on craft elements like character, voice, imagery, narrative structure, '
            'and emotional resonance, helping students tell meaningful stories.'
        ),
        'classes': [
            {
                'name': 'W104 Creative Writing (HS)',
                'code': 'W104',
                'subject': 'Creative Writing',
                'level': 'HS',
                'description': (
                    'An in-depth high school creative writing course exploring fiction, poetry, '
                    'drama/screenwriting, and creative nonfiction. Students develop their unique '
                    'voice through craft elements: character, imagery, narrative structure, and '
                    'emotional resonance. Fridays 5–6:30 PM PST. 6-week course.'
                ),
            },
            {
                'name': 'W105 Creative Writing (HS)',
                'code': 'W105',
                'subject': 'Creative Writing',
                'level': 'HS',
                'description': (
                    'An in-depth high school creative writing course exploring fiction, poetry, '
                    'drama/screenwriting, and creative nonfiction. Students develop their unique '
                    'voice through craft elements: character, imagery, narrative structure, and '
                    'emotional resonance. Saturdays 7–8:30 AM PST. 6-week course.'
                ),
            },
        ],
    },
    {
        'email': 'prof.bergman808@gmail.com',
        'name':  'Deb Bergman',
        'bio': (
            'Creative writing instructor for middle school students (grades 6–8). '
            'Guides students through poetry, prose, personal narrative, and creative nonfiction, '
            'drawing on published works to inspire original writing. Students develop their own '
            'voices and build an active portfolio showcasing their creative work.'
        ),
        'classes': [
            {
                'name': 'W101 Creative Writing (MS)',
                'code': 'W101MS',
                'subject': 'Creative Writing',
                'level': 'MS',
                'description': (
                    'Middle school creative writing course (grades 6–8) exploring poetry, prose, '
                    'personal narrative, and creative nonfiction. Students examine published works '
                    'and develop their own voices as writers, building an active portfolio. '
                    'Tuesdays 5:30–7 PM PST. 6-week course.'
                ),
            },
            {
                'name': 'W102 Creative Writing (MS)',
                'code': 'W102MS',
                'subject': 'Creative Writing',
                'level': 'MS',
                'description': (
                    'Middle school creative writing course (grades 6–8) exploring poetry, prose, '
                    'personal narrative, and creative nonfiction. Students examine published works '
                    'and develop their own voices as writers, building an active portfolio. '
                    'Saturdays 2:00–3:30 PM PST. 6-week course.'
                ),
            },
        ],
    },
    {
        'email': 'sunitaicmas@gmail.com',
        'name':  'Sunita Agrawal',
        'bio': (
            'Certified and experienced Abacus and Vedic Mathematics coach with over 20 years of '
            'teaching experience across five schools as well as private and online classes. '
            'Passionate about helping students develop strong numerical skills, mental agility, '
            'and confidence in mathematics. Teaching approach focuses on making mathematics '
            'enjoyable, practical, and accessible for learners of all ages. Recipient of national '
            'and international recognition for excellence in mathematics education. Has successfully '
            'guided hundreds of students in improving calculation speed, accuracy, concentration, '
            'and problem-solving abilities through Abacus and Vedic Mathematics techniques.'
        ),
        'classes': [
            {
                'name': 'Vedic Mathematics',
                'code': 'M110',
                'subject': 'Vedic Mathematics',
                'level': 'General',
                'description': (
                    'An engaging course for grades 3–12 designed to help students perform '
                    'mathematical calculations quickly, accurately, and confidently using '
                    'time-tested techniques and mental math strategies. Based on ancient Indian '
                    'mathematical principles, covers efficient methods for arithmetic, algebra, '
                    'squares, cubes, and roots. Particularly beneficial for standardized tests, '
                    'competitive exams, and Olympiads. Flexible length: semester, year-long, or '
                    'ongoing program. Prerequisites: basic arithmetic operations.'
                ),
            },
        ],
    },
    {
        'email': 'amaewal@gmail.com',
        'name':  'Akhilesh Maewal',
        'bio': (
            'AP Physics instructor teaching algebra-based, introductory college-level physics. '
            'Covers Newtonian mechanics (including rotational motion), work, energy and power, '
            'mechanical waves and sound, and introductory circuits through inquiry-based '
            'investigations. Twenty-five percent of instructional time is devoted to hands-on '
            'laboratory work. This course meets the UC/CSU D requirement and is UC-approved for '
            'extra honors credit.'
        ),
        'classes': [
            {
                'name': 'AP Physics 1A',
                'code': 'P101A',
                'subject': 'Physics',
                'level': 'HS',
                'description': (
                    'AP Physics 1 (Part A) — algebra-based, introductory college-level physics. '
                    'Topics: Newtonian mechanics, work/energy/power, mechanical waves, sound, and '
                    'simple circuits. 25% hands-on lab time with inquiry-based investigations. '
                    'Meets UC/CSU D requirement; approved for honors credit (A=5, B=4, C=3). '
                    'Prerequisite: concurrent enrollment in Honors Pre-Calculus or equivalent.'
                ),
            },
            {
                'name': 'AP Physics 1B',
                'code': 'P101B',
                'subject': 'Physics',
                'level': 'HS',
                'description': (
                    'AP Physics 1 (Part B) — continuation of AP Physics 1A. Algebra-based '
                    'college-level physics with deeper exploration of topics covered in 1A. '
                    'Emphasis on inquiry-based laboratory investigations and collaborative '
                    'problem-solving. Linked with Physics of the Universe 1–2. '
                    'Prerequisite: AP Physics 1A or equivalent.'
                ),
            },
        ],
    },
    {
        'email': 'shivkeyal@gmail.com',
        'name':  'Shiv Keyal',
        'bio': (
            'Mathematics instructor specializing in creative problem solving and math competitions. '
            'Teaches Creative Problem Solving 1 (MOEMS, grades 3–6) for students building '
            'foundational problem-solving strategies, and Creative Problem Solving 2 '
            '(AMC8/Mathcounts, grades 6–8) for students preparing for math olympiads and '
            'competitions. Dedicated to making mathematical thinking accessible and rewarding.'
        ),
        'classes': [
            {
                'name': 'Creative Problem Solving 1 (MOEMS)',
                'code': 'M104',
                'subject': 'Mathematics',
                'level': 'Elementary',
                'description': (
                    'Designed to teach problem-solving strategies for grades 3–6. Students learn '
                    'basic math skills and problem-solving strategies before tackling more '
                    'difficult contest problems. Aimed at students with experience in basic math '
                    'concepts who want to prepare for math contests like Math Olympiads (MOEMS). '
                    'No prerequisites.'
                ),
            },
            {
                'name': 'Creative Problem Solving 2 (AMC8/Mathcounts)',
                'code': 'M105',
                'subject': 'Mathematics',
                'level': 'MS',
                'description': (
                    'Designed to improve problem-solving skills for grades 6–8. Aimed at students '
                    'with experience in math competitions preparing for AMC 8 and MATHCOUNTS. '
                    'Builds on Creative Problem Solving 1 with more advanced contest strategies. '
                    'Prerequisite: Creative Problem Solving 1 or equivalent.'
                ),
            },
        ],
    },
]

# ── hash password ─────────────────────────────────────────────────────────────
pwd_hash = bcrypt.hashpw(TEMP_PWD.encode(), bcrypt.gensalt(10)).decode()

# ── process each teacher ──────────────────────────────────────────────────────
def escape_sql(s):
    return s.replace("'", "''")

for t in TEACHERS:
    email = t['email']
    name  = t['name']
    bio   = t['bio']
    print(f'\n== {name} ({email}) ==')

    # 1. Check if user exists
    check_sql = f"SELECT id FROM users WHERE email = '{escape_sql(email)}';"
    out = run(check_sql)
    # Parse the UUID from output
    uid = None
    for line in out.splitlines():
        line = line.strip()
        if len(line) == 36 and line.count('-') == 4:
            uid = line
            break

    if uid:
        print(f'  User exists: {uid}')
        # Update bio and show_on_team
        update_sql = f"""
UPDATE users
SET bio = '{escape_sql(bio)}',
    show_on_team = TRUE
WHERE id = '{uid}' AND role = 'teacher';
"""
        run(update_sql, 'update bio/show_on_team')
    else:
        print(f'  Creating new teacher account...')
        create_sql = f"""
INSERT INTO users (email, password_hash, name, role, is_active, account_status,
                   must_change_password, bio, show_on_team)
VALUES (
    '{escape_sql(email)}',
    '{escape_sql(pwd_hash)}',
    '{escape_sql(name)}',
    'teacher',
    TRUE,
    'active',
    TRUE,
    '{escape_sql(bio)}',
    TRUE
) RETURNING id;
"""
        out2 = run(create_sql, 'create user')
        for line in out2.splitlines():
            line = line.strip()
            if len(line) == 36 and line.count('-') == 4:
                uid = line
                break
        if uid:
            print(f'  Created: {uid}')
        else:
            print(f'  ERROR: could not get new user id — output was:\n{out2}')
            continue

    # 2. Upload profile photo if available
    if email in images:
        img_bytes, ext = images[email]
        ts        = int(time.time() * 1000)
        fname     = f'teacher_{uid}_{ts}{ext}'
        remote_dir = '/opt/arintu/backend/uploads/teacher-photos'
        remote_path = f'{remote_dir}/{fname}'
        print(f'  Uploading photo → {fname}')
        # Ensure directory exists
        client.exec_command(f'mkdir -p {remote_dir}')
        with sftp.open(remote_path, 'wb') as rf:
            rf.write(img_bytes)
        # Update profile_photo_path
        photo_sql = f"""
UPDATE users
SET profile_photo_path = '{remote_path}'
WHERE id = '{uid}';
"""
        run(photo_sql, 'set photo path')
        print(f'  Photo saved.')
    else:
        print(f'  No photo for this teacher.')

    # 3. Create classes (skip if name already exists case-insensitively)
    for cls in t['classes']:
        cls_name = cls['name']
        check_cls_sql = f"SELECT id FROM classes WHERE lower(name) = lower('{escape_sql(cls_name)}');"
        out3 = run(check_cls_sql)
        cls_id = None
        for line in out3.splitlines():
            line = line.strip()
            if len(line) == 36 and line.count('-') == 4:
                cls_id = line
                break

        if cls_id:
            print(f'  Class "{cls_name}" already exists ({cls_id}) — skipping.')
        else:
            code_val  = cls.get('code', '')
            subject   = cls.get('subject', '')
            level     = cls.get('level', '')
            desc      = cls.get('description', '')
            create_cls_sql = f"""
INSERT INTO classes (name, code, subject, level, description, admin_id, is_active)
VALUES (
    '{escape_sql(cls_name)}',
    '{escape_sql(code_val)}',
    '{escape_sql(subject)}',
    '{escape_sql(level)}',
    '{escape_sql(desc)}',
    '{uid}',
    TRUE
) RETURNING id;
"""
            out4 = run(create_cls_sql, f'create class {cls_name}')
            new_cls_id = None
            for line in out4.splitlines():
                line = line.strip()
                if len(line) == 36 and line.count('-') == 4:
                    new_cls_id = line
                    break
            if new_cls_id:
                print(f'  Created class "{cls_name}" ({new_cls_id})')
            else:
                print(f'  ERROR creating class "{cls_name}":\n{out4}')

sftp.close()
client.close()
print('\nSeeding complete!')
print(f'Temp password for all new accounts: {TEMP_PWD}')
print('Teachers must change password on first login.')
