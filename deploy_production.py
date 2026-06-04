"""
Full production deploy:
  1. git pull origin main
  2. npm install (backend)
  3. All DB migrations (012–014, teacher_profile, gallery, site_content) — all idempotent
  4. GRANT privileges to arintu DB user
  5. Create upload directories
  6. npm run build (frontend)
  7. pm2 restart + nginx reload
"""
import paramiko, sys, json, os, textwrap
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST     = '45.63.18.157'
PASSWORD = ']H6ym{7PEeWt(-28'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username='root', password=PASSWORD, timeout=60)
sftp = client.open_sftp()
print(f'Connected to production {HOST}')

# ─── helper ──────────────────────────────────────────────────────────────────
def run_cmd(cmd, label='', timeout=300):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    status = '✓' if exit_code == 0 else '✗'
    print(f'  {status} [{label or cmd[:60]}]', f'exit={exit_code}')
    if out: print('   ', out[:400])
    if err and exit_code != 0: print('    ERR:', err[:300])
    return exit_code, out, err

def run_sql(sql_str, label=''):
    with sftp.open('/tmp/prod_migration.sql', 'w') as f:
        f.write(sql_str)
    return run_cmd('su - postgres -c "psql -d arintu -f /tmp/prod_migration.sql"', label)

# ─── 1. Pull latest code ──────────────────────────────────────────────────────
print('\n=== 1. Pull latest code ===')
run_cmd('cd /opt/arintu && git fetch origin && git checkout main && git pull origin main',
        'git pull main')

# ─── 2. Backend npm install ───────────────────────────────────────────────────
print('\n=== 2. npm install (backend) ===')
run_cmd('cd /opt/arintu/backend && npm install --production', 'npm install', timeout=120)

# ─── 3. DB Migrations ─────────────────────────────────────────────────────────
print('\n=== 3. DB Migrations ===')

# 012: must_change_password
run_sql("""
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
""", '012 must_change_password')

# 013: class_recordings table
run_sql("""
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
""", '013 class_recordings')

# 014: class code + session teacher
run_sql("""
ALTER TABLE classes ADD COLUMN IF NOT EXISTS code VARCHAR(20);
CREATE UNIQUE INDEX IF NOT EXISTS idx_classes_code ON classes(code) WHERE code IS NOT NULL;
ALTER TABLE class_schedules ADD COLUMN IF NOT EXISTS session_code VARCHAR(20);
ALTER TABLE class_schedules ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_schedules_teacher      ON class_schedules(teacher_id);
CREATE INDEX IF NOT EXISTS idx_schedules_session_code ON class_schedules(session_code);
""", '014 class_code + session_teacher')

# teacher profile columns
run_sql("""
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS bio                TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url       VARCHAR(500),
  ADD COLUMN IF NOT EXISTS profile_photo_path VARCHAR(500),
  ADD COLUMN IF NOT EXISTS show_on_team       BOOLEAN DEFAULT TRUE;
""", 'teacher profile columns')

# gallery_items table
run_sql("""
CREATE TABLE IF NOT EXISTS gallery_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(255),
  description     TEXT,
  file_path       VARCHAR(500) NOT NULL,
  original_name   VARCHAR(255),
  file_type       VARCHAR(10)  NOT NULL CHECK (file_type IN ('photo','video')),
  mime_type       VARCHAR(100),
  file_size       INTEGER,
  status          VARCHAR(20)  NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected')),
  uploader_name   VARCHAR(100) NOT NULL,
  uploader_email  VARCHAR(255) NOT NULL,
  admin_notes     TEXT,
  reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gallery_status  ON gallery_items(status);
CREATE INDEX IF NOT EXISTS idx_gallery_created ON gallery_items(created_at DESC);
""", 'gallery_items table')

# site_content CMS table + default seeds
SITE_DEFAULTS = {
    'history': {
        'subtitle': "From a small living room in San Ramon to a global learning platform — here's the story so far.",
        'milestones': [
            {'year': '2018', 'title': 'The Beginning',               'description': 'Arintu was founded in San Ramon, California by a small group of educators who believed that geography should never be a barrier to a world-class education. The first cohort of 12 students joined from three countries.'},
            {'year': '2019', 'title': 'First 100 Students',          'description': 'By the end of 2019, Arintu had enrolled over 100 students across India, Nepal, and the United States. The team grew to include five dedicated teachers and an operations coordinator.'},
            {'year': '2020', 'title': 'Going Fully Online',          'description': 'When the global pandemic forced classrooms to close, Arintu pivoted fast. The entire programme moved online within two weeks — suddenly learners anywhere in the world could attend. Enrolment tripled.'},
            {'year': '2021', 'title': '10+ Countries',               'description': 'Arintu expanded its footprint to over ten countries. Country-specific pricing was introduced to ensure quality learning remained accessible regardless of economic background. A scholarship fund was established.'},
            {'year': '2022', 'title': 'Scholarship Programme Launch','description': 'Arintu launched a structured scholarship programme. Every class now reserves 20% of its seats for scholarship recipients — full or partial — chosen by the admin team.'},
            {'year': '2023', 'title': '5,000 Learners',              'description': 'Arintu crossed 5,000 active learners, running over 40 concurrent classes taught by a faculty of 30+ teachers.'},
            {'year': '2024', 'title': 'AI-Assisted Learning',        'description': 'Arintu introduced its first AI-powered features: personalised practice recommendations, automatic progress summaries, and a smart scheduling assistant.'},
            {'year': '2025', 'title': 'Community & Beyond',          'description': 'Arintu Online and Enfinitty Circle launched — connecting learners, alumni, and educators in a vibrant global community.'},
        ],
    },
    'jobs': {
        'emoji': '\U0001f680', 'title': "We're Hiring — Soon",
        'subtitle': "Exciting opportunities are on the way. We're building a small, passionate team committed to making quality education accessible everywhere.",
        'contact_email': 'infoenfinitty@gmail.com',
    },
    'faq': {
        'items': [
            {'q': "Who are Arintu's classes for?",       'a': 'Our classes are designed for motivated learners of all ages who want to go beyond what their local school or institution offers.'},
            {'q': 'How do I enrol in a class?',           'a': "Browse our class catalogue, click 'Apply Now', create a free account, and submit an application. You'll be notified of the outcome within a few days."},
            {'q': 'Is there an application fee?',         'a': 'Yes, there is a one-time application fee that varies by country, charged on your first class application. Fee waivers are available — request from your dashboard.'},
            {'q': 'What is the scholarship programme?',   'a': 'Every class reserves up to 20% of its seats for scholarship recipients (full or partial). Request a scholarship when you apply for a class.'},
            {'q': 'Are classes live or recorded?',        'a': 'Classes are primarily live via Zoom. Recordings are available to enrolled students for review.'},
            {'q': 'What languages are classes taught in?','a': 'The majority of classes are taught in English. Some classes are available in Hindi and other languages.'},
            {'q': "Can I drop a class once I've enrolled?",'a': 'Contact your teacher or email infoenfinitty@gmail.com. Refund and withdrawal policies depend on the class and how far the course has progressed.'},
            {'q': 'How are teachers vetted?',             'a': 'All teachers go through credential verification, a teaching demonstration, and reference checks.'},
        ],
    },
    'testimonials': {
        'categories': ['All', 'Student Teachers', 'Students', 'Parents', 'Community'],
        'items': [
            {'id': 1, 'category': 'Students', 'name': 'Maya T.',  'role': 'Arintu student', 'location': 'Los Angeles, CA', 'quote': "A year after joining Arintu, I'm admitted to UC Berkeley. The rigor, the teachers, and the community pushed me far beyond what I thought I was capable of.", 'avatar': 'MT', 'color': 'bg-brand-100 text-brand-700'},
            {'id': 2, 'category': 'Students', 'name': 'Ethan L.', 'role': 'Arintu student', 'location': 'Vancouver, BC',   'quote': "The scholarship made Arintu accessible for me. I found mentors and friends from five different countries who I'm still in touch with today.", 'avatar': 'EL', 'color': 'bg-brand-100 text-brand-700'},
            {'id': 3, 'category': 'Parents',  'name': 'Sunita R.','role': 'Parent of an Arintu student', 'location': 'Hyderabad, India', 'quote': "I always know what's being taught, when classes are happening, and how my daughter is progressing. I feel like a genuine partner in her education.", 'avatar': 'SR', 'color': 'bg-emerald-100 text-emerald-700'},
            {'id': 4, 'category': 'Parents',  'name': 'James O.', 'role': 'Parent of an Arintu student', 'location': 'Austin, TX',       'quote': 'My son was bored in regular school. After two months at Arintu, he was waking up early on class days. That transformation in attitude is priceless.', 'avatar': 'JO', 'color': 'bg-emerald-100 text-emerald-700'},
        ],
    },
    'hq': {
        'address_lines': ['Arintu', '12268 Darkwood Road', 'San Diego, CA 92129', 'United States'],
        'email': 'infoenfinitty@gmail.com',
        'hours': 'Monday – Friday\n9:00 AM – 6:00 PM PT',
        'hours_note': 'Closed on major US holidays',
        'global_reach': 'Headquartered in the San Diego area, Arintu serves learners from around the world.',
    },
    'book_club': {'emoji': '\U0001f4da', 'title': 'Book Club — Coming Soon', 'subtitle': "We're putting together something special for our reading community. The Arintu Book Club will launch soon — stay tuned!"},
    'contact': {'email': 'infoenfinitty@gmail.com', 'address_lines': ['12268 Darkwood Road', 'San Diego, CA 92129', 'United States'], 'response_time': 'We aim to respond to all enquiries within one business day (Monday–Friday, 9 AM–6 PM PT).'},
    'enfinitty_circle': {
        'hero_badge': '\U0001f31f Student Volunteers', 'hero_title': 'The Enfinitty Circle',
        'hero_subtitle': 'A student-run volunteer club dedicated to mentoring younger learners and hosting educational events at schools across the community.',
        'mission': 'To give every student a role model they can relate to — someone just a few years ahead of them.',
        'activities': [
            {'icon': '\U0001f393', 'title': 'Peer Mentorship',        'desc': 'Members mentor younger students one-on-one and in small groups.'},
            {'icon': '\U0001f3eb', 'title': 'School Outreach Events', 'desc': 'Volunteers host workshops, math challenges, and science demos at local schools.'},
            {'icon': '\U0001f310', 'title': 'Global Community',       'desc': 'Members collaborate across cities and countries, building friendships and shared purpose.'},
        ],
        'steps': ['Be an active Arintu student or alumni', 'Express your interest via the Contact page', 'Complete a short orientation', 'Choose your first event and get started'],
    },
    'arintu_online': {
        'hero_badge': '\U0001f310 All classes. One platform.', 'hero_title': 'Arintu Online',
        'hero_subtitle': 'Every Arintu class runs on our integrated online platform — purpose-built for deep learning.',
        'features': [
            {'icon': '\U0001f3a5', 'title': 'Live Classes via Zoom',  'desc': 'All sessions run live alongside classmates from around the world.'},
            {'icon': '\U0001f4fc', 'title': 'Session Recordings',     'desc': 'Enrolled students have access to recordings for the duration of their course.'},
            {'icon': '\U0001f4ca', 'title': 'Progress Dashboard',     'desc': 'Track attendance, assignment completion, and performance trends.'},
            {'icon': '\U0001f46a', 'title': 'Parent Sync',            'desc': 'Parents stay fully in the loop with class communications and progress updates.'},
        ],
        'how_it_works': [
            {'step': '01', 'label': 'Browse classes', 'desc': 'Find the right class for your level.'},
            {'step': '02', 'label': 'Apply',          'desc': 'Create an account and submit your application.'},
            {'step': '03', 'label': 'Get approved',   'desc': 'An admin reviews your application and enrols you.'},
            {'step': '04', 'label': 'Start learning', 'desc': 'Join your first live session.'},
        ],
    },
}

site_sql_parts = ["""
CREATE TABLE IF NOT EXISTS site_content (
    section    VARCHAR(100) PRIMARY KEY,
    content    JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);
"""]
for section, data in SITE_DEFAULTS.items():
    content_json = json.dumps(data, ensure_ascii=False).replace("'", "''")
    site_sql_parts.append(
        f"INSERT INTO site_content (section, content) VALUES ('{section}', '{content_json}'::jsonb) ON CONFLICT (section) DO NOTHING;\n"
    )
run_sql(''.join(site_sql_parts), 'site_content CMS table + seeds')

# ─── 4. GRANT privileges ──────────────────────────────────────────────────────
print('\n=== 4. Grant DB privileges ===')
run_sql("""
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO arintu;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO arintu;
""", 'grant privileges')

# ─── 5. Upload directories ────────────────────────────────────────────────────
print('\n=== 5. Create upload directories ===')
run_cmd('mkdir -p /opt/arintu/backend/uploads/team-photos '
        '/opt/arintu/backend/uploads/teacher-photos '
        '/opt/arintu/backend/uploads/gallery '
        '/opt/arintu/backend/uploads/id-documents '
        '&& chown -R www-data:www-data /opt/arintu/backend/uploads 2>/dev/null || true',
        'upload dirs')

# ─── 6. Build frontend ────────────────────────────────────────────────────────
print('\n=== 6. Build frontend ===')
run_cmd('cd /opt/arintu/frontend && npm install && npm run build', 'npm build', timeout=300)

# ─── 7. Restart services ──────────────────────────────────────────────────────
print('\n=== 7. Restart services ===')
run_cmd('pm2 restart arintu-api --update-env', 'pm2 restart')
run_cmd('systemctl reload nginx', 'nginx reload')

# ─── 8. Smoke check ───────────────────────────────────────────────────────────
print('\n=== 8. Smoke check ===')
run_cmd('pm2 list', 'pm2 list')
run_cmd('su - postgres -c "psql -d arintu -c '
        '\'SELECT table_name FROM information_schema.tables '
        'WHERE table_schema=\'\'public\'\' ORDER BY table_name;\'"',
        'DB tables')

sftp.close()
client.close()
print('\n✅  Production deploy complete.')
