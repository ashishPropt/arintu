"""
Send welcome / credentials emails to newly created teacher accounts.
Uses the Zoho SMTP config already in the server .env.
"""
import smtplib, sys
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# ── SMTP settings (from server .env) ─────────────────────────────────────────
SMTP_HOST = 'smtp.zoho.com'
SMTP_PORT = 587
SMTP_USER = 'admin@enfinitty.com'
SMTP_PASS = 'X0aT1fNiLPxK'
FROM_ADDR = 'Arintu Learning <admin@enfinitty.com>'
SUPPORT   = 'admin@enfinitty.com'
LOGIN_URL = 'http://arintu.enfinitty.com/login'
TEMP_PWD  = 'ArintuTeach2025!'

# ── Teachers ──────────────────────────────────────────────────────────────────
TEACHERS = [
    {'name': 'Abe Clark',       'email': 'abeclark@gmail.com',        'subject': 'Creative Writing (HS)'},
    {'name': 'Deb Bergman',     'email': 'prof.bergman808@gmail.com', 'subject': 'Creative Writing (MS)'},
    {'name': 'Sunita Agrawal',  'email': 'sunitaicmas@gmail.com',     'subject': 'Vedic Mathematics'},
    {'name': 'Akhilesh Maewal', 'email': 'amaewal@gmail.com',         'subject': 'AP Physics'},
    {'name': 'Shiv Keyal',      'email': 'shivkeyal@gmail.com',       'subject': 'Creative Problem Solving'},
]

# ── Email layout helpers ──────────────────────────────────────────────────────
def wrap(content):
    return f"""
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px">
  <div style="background:#fff;border-radius:10px;padding:28px 32px;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
    <div style="margin-bottom:20px">
      <span style="font-size:22px;font-weight:800;color:#2563eb;letter-spacing:-0.5px">Arintu</span>
      <span style="font-size:13px;color:#6b7280;margin-left:8px">Learning Platform</span>
    </div>
    {content}
    <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0"/>
    <p style="color:#9ca3af;font-size:12px;margin:0">
      Questions? Contact us at <a href="mailto:{SUPPORT}" style="color:#2563eb">{SUPPORT}</a>
    </p>
  </div>
</div>"""

def btn(url, label, color='#2563eb'):
    return f'<a href="{url}" style="display:inline-block;margin:20px 0;padding:11px 26px;background:{color};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">{label}</a>'

def make_email(name, teacher_email, subject_area):
    first = name.split()[0]
    html = wrap(f"""
      <h2 style="color:#1e293b;margin:0 0 8px">Welcome to the Arintu Teaching Roster! 🎉</h2>
      <p>Hi {name},</p>
      <p>We're excited to have you join <strong>Arintu Learning Platform</strong> as a teacher
         for <strong>{subject_area}</strong>.</p>
      <p>Your account has been created. Here are your sign-in credentials:</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin:16px 0">
        <p style="margin:0 0 8px"><strong>Login URL:</strong>
          <a href="{LOGIN_URL}" style="color:#2563eb">{LOGIN_URL}</a></p>
        <p style="margin:0 0 8px"><strong>Email:</strong> {teacher_email}</p>
        <p style="margin:0"><strong>Temporary password:</strong>
          <code style="background:#e2e8f0;padding:3px 8px;border-radius:4px;font-size:15px;font-weight:700">{TEMP_PWD}</code>
        </p>
      </div>
      <p style="color:#dc2626;font-size:13px;font-weight:600">
        ⚠️ You will be prompted to set a new password immediately upon first login.
        Please do so before exploring the platform.
      </p>
      <p>Once logged in you can:</p>
      <ul style="color:#374151;font-size:14px;line-height:1.8">
        <li>Update your bio and profile photo</li>
        <li>View your assigned classes</li>
        <li>Manage student schedules and recordings</li>
      </ul>
      {btn(LOGIN_URL, 'Sign In to Arintu')}
      <p style="color:#9ca3af;font-size:12px">
        If you have any questions getting started, reply to this email or reach us at
        <a href="mailto:{SUPPORT}" style="color:#2563eb">{SUPPORT}</a>.
      </p>""")

    text = (
        f"Hi {name},\n\n"
        f"Welcome to the Arintu Learning Platform teaching roster — we're thrilled to have you "
        f"on board as our {subject_area} instructor!\n\n"
        f"Your account has been created. Here are your login credentials:\n\n"
        f"  Login URL:          {LOGIN_URL}\n"
        f"  Email:              {teacher_email}\n"
        f"  Temporary password: {TEMP_PWD}\n\n"
        f"IMPORTANT: You will be asked to set a new password the first time you sign in. "
        f"Please change it before doing anything else.\n\n"
        f"Once logged in you can update your bio and profile photo, view your classes, "
        f"and manage student schedules.\n\n"
        f"Questions? Reply to this email or contact us at {SUPPORT}.\n\n"
        f"Welcome aboard!\n"
        f"The Arintu Team"
    )
    return html, text

# ── Send ──────────────────────────────────────────────────────────────────────
print(f'Connecting to {SMTP_HOST}:{SMTP_PORT} as {SMTP_USER}...')
try:
    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30)
    server.ehlo()
    server.starttls()
    server.ehlo()
    server.login(SMTP_USER, SMTP_PASS)
    print('SMTP login successful.\n')
except Exception as e:
    print(f'SMTP connection failed: {e}')
    sys.exit(1)

for t in TEACHERS:
    html_body, text_body = make_email(t['name'], t['email'], t['subject'])

    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'Welcome to Arintu — your account is ready'
    msg['From']    = FROM_ADDR
    msg['To']      = t['email']
    msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
    msg.attach(MIMEText(html_body, 'html',  'utf-8'))

    try:
        server.sendmail(SMTP_USER, t['email'], msg.as_string())
        print(f'  ✓ Sent to {t["name"]} <{t["email"]}>')
    except Exception as e:
        print(f'  ✗ Failed for {t["name"]} <{t["email"]}>: {e}')

server.quit()
print('\nAll emails sent.')
