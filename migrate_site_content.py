"""
Migration: Create site_content table and seed with default page content.
Run once to enable the CMS for all public pages.
"""
import paramiko, sys, json

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

host     = '207.246.86.179'
password = 'v+Z3F6jWu(n*H}aB'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username='root', password=password, timeout=30)
sftp = client.open_sftp()

# ── Default content for each section ─────────────────────────────────────────

DEFAULTS = {
    'history': {
        'subtitle': "From a small living room in San Ramon to a global learning platform — here's the story so far.",
        'milestones': [
            {'year': '2018', 'title': 'The Beginning',              'description': 'Arintu was founded in San Ramon, California by Shiv Kayal and a small group of educators who believed that geography should never be a barrier to a world-class education. The first cohort of 12 students joined from three countries.'},
            {'year': '2019', 'title': 'First 100 Students',         'description': 'Word spread quickly. By the end of 2019, Arintu had enrolled over 100 students across India, Nepal, and the United States. The team grew to include five dedicated teachers and an operations coordinator.'},
            {'year': '2020', 'title': 'Going Fully Online',         'description': 'When the global pandemic forced classrooms to close, Arintu pivoted fast. The entire programme moved online within two weeks. What was initially a constraint became a strength — suddenly learners anywhere in the world could attend. Enrolment tripled.'},
            {'year': '2021', 'title': '10+ Countries',              'description': 'Arintu expanded its footprint to over ten countries. Country-specific pricing was introduced to ensure that quality learning remained accessible regardless of economic background. A dedicated scholarship fund was established.'},
            {'year': '2022', 'title': 'Scholarship Programme Launch','description': 'Formalising what had been an informal arrangement, Arintu launched a structured scholarship programme. Every class now reserves 20% of its seats for scholarship recipients — full or partial — chosen by the super admin.'},
            {'year': '2023', 'title': '5,000 Learners',             'description': 'A milestone year. Arintu crossed 5,000 active learners, running over 40 concurrent classes taught by a faculty of 30+ teachers. Ashish Mathur joined as VP of Technology to lead the next phase of platform development.'},
            {'year': '2024', 'title': 'AI-Assisted Learning',       'description': 'Arintu introduced its first AI-powered features: personalised practice recommendations, automatic progress summaries, and a smart scheduling assistant. The platform infrastructure was rebuilt from the ground up to support the next ten years of growth.'},
            {'year': '2025', 'title': 'Community & Beyond',         'description': 'Arintu Online and Enfinitty Circle launched — connecting learners, alumni, and educators in a vibrant global community. The Book Club was introduced, giving every member a voice in shaping the curriculum. The journey continues.'},
        ],
    },
    'jobs': {
        'emoji': '\U0001f680',
        'title': "We're Hiring — Soon",
        'subtitle': "Exciting opportunities are on the way. We're building a small, passionate team committed to making quality education accessible everywhere. Check back here for open roles as we grow.",
        'contact_email': 'infoenfinitty@gmail.com',
    },
    'faq': {
        'items': [
            {'q': "Who are Arintu's classes for?",       'a': 'Our classes are designed for motivated learners of all ages who want to go beyond what their local school or institution offers. We serve students from primary school through to working professionals looking to upskill.'},
            {'q': 'How do I enrol in a class?',           'a': 'Browse our class catalogue on the home page. Click "Apply Now" on any class you\'re interested in. You\'ll need to create a free account (or sign in) and submit an application. Applications are reviewed and you\'ll be notified of the outcome within a few days.'},
            {'q': 'Is there an application fee?',         'a': "Yes, there is a one-time application fee that varies by country. The fee is charged on your first class application and is waived for all subsequent classes. If you're unable to pay the fee, you can request a waiver from your dashboard — a super admin will review your request."},
            {'q': 'What is the scholarship programme?',   'a': 'Every class reserves up to 20% of its seats for scholarship recipients. Scholarships can be full (class fee fully covered) or partial (a percentage discount). You can request a scholarship when you apply for a class. The super admin makes all scholarship decisions.'},
            {'q': 'Are classes live or recorded?',        'a': 'Our classes are primarily live, conducted over Zoom at scheduled times. Recorded sessions are made available to enrolled students for review. We believe live interaction between students and teachers is essential to the Arintu learning experience.'},
            {'q': 'What languages are classes taught in?','a': 'The majority of our classes are taught in English. We periodically offer classes in Hindi and other languages — check the class description for language details.'},
            {'q': "Can I drop a class once I've enrolled?",'a': 'Please contact your class teacher or reach out to us at infoenfinitty@gmail.com. Refund and withdrawal policies depend on the class and how far along the course has progressed.'},
            {'q': 'How are teachers vetted?',             'a': 'All Arintu teachers go through a rigorous review process that includes credential verification, a teaching demonstration, and reference checks. We prioritise educators with a track record of engaging, inclusive teaching.'},
            {'q': 'What is Enfinitty Circle?',            'a': 'Enfinitty Circle is our exclusive community for high-achieving Arintu learners. Members get access to mentorship sessions, networking events, guest speaker series, and an alumni network spanning dozens of countries.'},
            {'q': 'How do I get in touch with support?',  'a': "Email us at infoenfinitty@gmail.com or reach out through the dashboard's notification system. We aim to respond to all queries within one business day."},
        ],
    },
    'testimonials': {
        'categories': ['All', 'Student Teachers', 'Students', 'Parents', 'Community'],
        'items': [
            {'id': 1,  'category': 'Student Teachers', 'name': 'Arjun M.',      'role': 'Enfinitty Circle — Student Volunteer', 'location': 'San Diego, CA',    'quote': 'Mentoring younger kids through the Circle completely changed my perspective on learning. When you have to explain a concept clearly enough for a 7th grader to understand it, you realize how much deeper your own understanding becomes.', 'avatar': 'AM', 'color': 'bg-purple-100 text-purple-700'},
            {'id': 2,  'category': 'Student Teachers', 'name': 'Priya K.',      'role': 'Enfinitty Circle — Student Volunteer', 'location': 'India cohort',     'quote': "Hosting a math workshop at a local elementary school was one of the most rewarding things I've ever done. The kids' excitement when they finally \"got it\" reminded me exactly why I love mathematics.", 'avatar': 'PK', 'color': 'bg-purple-100 text-purple-700'},
            {'id': 3,  'category': 'Student Teachers', 'name': 'Rohan S.',      'role': 'Enfinitty Circle — Student Volunteer', 'location': 'San Jose, CA',     'quote': 'I was nervous about public speaking, but the Circle gave me a safe space to grow. After running three school events, I can now stand in front of a room of 60 kids with confidence.', 'avatar': 'RS', 'color': 'bg-purple-100 text-purple-700'},
            {'id': 4,  'category': 'Students',         'name': 'Maya T.',       'role': 'Arintu student',                          'location': 'Los Angeles, CA',  'quote': "I applied to Arintu not knowing what to expect. A year later, I'm admitted to UC Berkeley. The rigor, the teachers, and the community of peers pushed me far beyond what I thought I was capable of.", 'avatar': 'MT', 'color': 'bg-brand-100 text-brand-700'},
            {'id': 5,  'category': 'Students',         'name': 'Ethan L.',      'role': 'Arintu student',                          'location': 'Vancouver, BC',    'quote': "The scholarship made Arintu accessible for me. What I got in return was so much more than world-class instruction — I found mentors and friends from five different countries who I'm still in touch with today.", 'avatar': 'EL', 'color': 'bg-brand-100 text-brand-700'},
            {'id': 6,  'category': 'Students',         'name': 'Aisha N.',      'role': 'Arintu student',                          'location': 'Lagos, Nigeria',   'quote': "Growing up, I assumed the best education was only for students in the US or UK. Arintu showed me that geography is no longer a barrier. I'm competing with — and learning alongside — some of the brightest students in the world, right from my home.", 'avatar': 'AN', 'color': 'bg-brand-100 text-brand-700'},
            {'id': 7,  'category': 'Parents',          'name': 'Sunita R.',     'role': 'Parent of an Arintu student',             'location': 'Hyderabad, India', 'quote': "What I appreciate most is how transparent the communication is. I always know what's being taught, when classes are happening, and how my daughter is progressing. I feel like a genuine partner in her education, not an afterthought.", 'avatar': 'SR', 'color': 'bg-emerald-100 text-emerald-700'},
            {'id': 8,  'category': 'Parents',          'name': 'James O.',      'role': 'Parent of an Arintu student',             'location': 'Austin, TX',       'quote': 'My son was bored and disengaged in his regular school. After two months at Arintu, he was waking up early on class days. That transformation in attitude toward learning is priceless.', 'avatar': 'JO', 'color': 'bg-emerald-100 text-emerald-700'},
            {'id': 9,  'category': 'Parents',          'name': 'Lin W.',        'role': 'Parent of an Arintu student',             'location': 'Singapore',        'quote': 'The teachers genuinely care. My daughter struggled at the start, and her teacher reached out to us before we even had a chance to ask for help. That level of attentiveness is rare.', 'avatar': 'LW', 'color': 'bg-emerald-100 text-emerald-700'},
            {'id': 10, 'category': 'Community',        'name': 'Dr. Patricia H.','role': 'Elementary school principal',            'location': 'San Diego, CA',    'quote': "The Enfinitty Circle volunteers who came to our school were remarkable young people — prepared, enthusiastic, and great with kids. Our 4th and 5th graders are still talking about the math challenges they ran. We've already invited them back.", 'avatar': 'PH', 'color': 'bg-accent-100 text-accent-700'},
            {'id': 11, 'category': 'Community',        'name': 'Marcus J.',     'role': 'Middle school teacher',                   'location': 'Chula Vista, CA',  'quote': "Having near-peer role models — high schoolers and college students who look like my students and come from similar backgrounds — has a motivational power that adult teachers simply can't replicate. The Circle volunteers understand this instinctively.", 'avatar': 'MJ', 'color': 'bg-accent-100 text-accent-700'},
        ],
    },
    'enfinitty_circle': {
        'hero_badge':    '\U0001f31f Student Volunteers',
        'hero_title':    'The Enfinitty Circle',
        'hero_subtitle': 'The Enfinitty Circle is a student-run volunteer club dedicated to mentoring younger learners and hosting educational events at middle and elementary schools across our community.',
        'mission':       'To give every student a role model they can relate to — someone just a few years ahead of them — and to bring the joy of learning to kids in their own neighborhoods.',
        'activities': [
            {'icon': '\U0001f393', 'title': 'Peer Mentorship',           'desc': 'Circle members mentor younger students one-on-one and in small groups, sharing study strategies, subject expertise, and guidance on navigating school.'},
            {'icon': '\U0001f3eb', 'title': 'School Outreach Events',    'desc': 'Volunteers host workshops, math challenges, and science demos at local middle and elementary schools — sparking curiosity and a love of learning in younger kids.'},
            {'icon': '\U0001f310', 'title': 'Global Community',          'desc': 'Members collaborate across cities and countries, building friendships and a shared sense of purpose that goes far beyond any single classroom.'},
            {'icon': '\U0001f5e3️', 'title': 'Leadership & Communication', 'desc': 'Running events, coordinating with schools, and mentoring peers builds real leadership skills — public speaking, project management, and empathy.'},
            {'icon': '\U0001f4e3', 'title': 'Student-Led Initiatives',   'desc': 'The Circle is entirely student-driven. Members propose and lead their own events, giving every volunteer real ownership and creative freedom.'},
            {'icon': '\U0001f91d', 'title': 'Community Impact',          'desc': 'Every event and mentorship session creates a ripple effect — students who are inspired go on to inspire others, growing a culture of learning in the community.'},
        ],
        'steps': [
            'Be an active, engaged Arintu student or alumni',
            'Express your interest to your teacher or via the Contact page',
            'Complete a short orientation with a Circle coordinator',
            'Choose your first event or mentorship commitment and get started',
        ],
    },
    'arintu_online': {
        'hero_badge':    '\U0001f310 All classes. One platform.',
        'hero_title':    'Arintu Online',
        'hero_subtitle': "Every Arintu class runs on our integrated online platform — purpose-built for deep learning, not just content delivery. Here's what you get when you enrol.",
        'features': [
            {'icon': '\U0001f3a5', 'title': 'Live Classes via Zoom',   'desc': 'All Arintu sessions run live, so you learn in real time alongside classmates from around the world. Every class is capped to keep the teacher-student ratio high.'},
            {'icon': '\U0001f4fc', 'title': 'Session Recordings',      'desc': 'Miss a session or want to review? Enrolled students have access to recordings for the duration of their course. Learn at your own pace without falling behind.'},
            {'icon': '\U0001f916', 'title': 'AI Learning Assistant',   'desc': 'Our AI assistant analyses your practice patterns and suggests targeted exercises. It flags topics you should revisit before the next session and celebrates your wins.'},
            {'icon': '\U0001f4ca', 'title': 'Progress Dashboard',      'desc': 'Track attendance, assignment completion, and performance trends in a clear, visual dashboard. Teachers and students see the same data, making support conversations more effective.'},
            {'icon': '\U0001f5d3️', 'title': 'Smart Scheduling', 'desc': "Our scheduling system considers timezones, public holidays, and teacher availability to find slots that work for every student. You'll never miss a class due to a scheduling conflict."},
            {'icon': '\U0001f4ac', 'title': 'Async Q&A',               'desc': 'Got a question between sessions? Post it in the class channel. Teachers and TAs respond within 24 hours. High-quality answers are pinned for the whole cohort to see.'},
            {'icon': '\U0001f46a', 'title': 'Parent Sync',             'desc': 'Parents stay fully in the loop. All class communications, session summaries, progress updates, and schedule changes are automatically shared with parents so families are always informed.'},
        ],
        'how_it_works': [
            {'step': '01', 'label': 'Browse classes', 'desc': 'Find the right class for your level and schedule.'},
            {'step': '02', 'label': 'Apply',          'desc': 'Create an account and submit your application in minutes.'},
            {'step': '03', 'label': 'Get approved',   'desc': 'An admin reviews your application and enrols you.'},
            {'step': '04', 'label': 'Start learning', 'desc': 'Join your first live session and never look back.'},
        ],
    },
    'hq': {
        'address_lines': ['Arintu', '12268 Darkwood Road', 'San Diego, CA 92129', 'United States'],
        'email':         'infoenfinitty@gmail.com',
        'hours':         'Monday – Friday\n9:00 AM – 6:00 PM PT',
        'hours_note':    'Closed on major US holidays',
        'global_reach':  'Headquartered in the San Diego area, Arintu plans to serve learners from around the world.',
    },
    'book_club': {
        'emoji':    '\U0001f4da',
        'title':    'Book Club — Coming Soon',
        'subtitle': "We're putting together something special for our reading community. The Arintu Book Club will launch soon — stay tuned!",
    },
    'contact': {
        'email':         'infoenfinitty@gmail.com',
        'address_lines': ['12268 Darkwood Road', 'San Diego, CA 92129', 'United States'],
        'response_time': 'We aim to respond to all enquiries within one business day (Monday–Friday, 9 AM–6 PM PT).',
    },
}

# ── Build SQL ─────────────────────────────────────────────────────────────────

sql_parts = ["""
-- Create site_content table
CREATE TABLE IF NOT EXISTS site_content (
    section    VARCHAR(100) PRIMARY KEY,
    content    JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);
"""]

for section, data in DEFAULTS.items():
    content_json = json.dumps(data, ensure_ascii=False).replace("'", "''")
    sql_parts.append(f"""
INSERT INTO site_content (section, content)
VALUES ('{section}', '{content_json}'::jsonb)
ON CONFLICT (section) DO NOTHING;
""")

sql = ''.join(sql_parts)

# ── Upload SQL file to server ─────────────────────────────────────────────────

with sftp.open('/tmp/migrate_site_content.sql', 'w') as f:
    f.write(sql)
sftp.close()

stdin, stdout, stderr = client.exec_command(
    'su - postgres -c "psql -d arintu -f /tmp/migrate_site_content.sql"'
)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')

print('=== SQL output ===')
print(out)
if err:
    print('=== STDERR ===')
    print(err)

client.close()
print('Migration complete.')
