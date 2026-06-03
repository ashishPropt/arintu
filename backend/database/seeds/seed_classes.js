/**
 * Seed script — teachers, classes, and sessions.
 *
 * Run once on the server:
 *   node /opt/arintu/backend/database/seeds/seed_classes.js
 *
 * Safe to re-run: uses ON CONFLICT DO NOTHING / checks before inserting.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const bcrypt  = require('bcryptjs');
const db      = require('../../database/db');

// ── All times in UTC.  Sessions start week of 2026-06-09 (Tue–Sun).
// PDT = UTC-7. Evening times cross midnight UTC so the UTC date is +1 day.
//
// Day map from PDT session day:
//   Tue PDT evening  → Wed UTC  (2026-06-10)
//   Fri PDT evening  → Sat UTC  (2026-06-13)
//   Sat PDT morning  → Sat UTC  (2026-06-13)
//   Sat PDT evening  → Sat UTC  (2026-06-13)
//   Sun PDT morning  → Sun UTC  (2026-06-14)
//   Sun PDT evening  → Sun UTC  (2026-06-14)
//   Tue PDT (4:30PM) → Tue UTC  (2026-06-09, 23:30)

const TEACHERS = [
  { lastName: 'Clark',   email: 'clark@arintu.com'   },
  { lastName: 'Kumar',   email: 'kumar@arintu.com'   },
  { lastName: 'Bergman', email: 'bergman@arintu.com' },
  { lastName: 'Mathur',  email: 'pmathur@arintu.com' }, // pmathur to avoid conflict with superadmin
  { lastName: 'Agrawal', email: 'agrawal@arintu.com' },
  { lastName: 'Keyal',   email: 'keyal@arintu.com'   },
  { lastName: 'Maewal',  email: 'maewal@arintu.com'  },
];

const CLASSES = [
  { code: 'W102', name: 'Intermediate Creative Writing', subject: 'Creative Writing', level: 'HS' },
  { code: 'W101', name: 'Beginner Creative Writing',     subject: 'Creative Writing', level: 'MS' },
  { code: 'T102', name: 'Intermediate Python',           subject: 'Python',           level: 'HS' },
  { code: 'T101', name: 'Beginner Python',               subject: 'Python',           level: 'MS' },
  { code: 'M103', name: 'Speed (Vedic) Math',            subject: 'Mathematics',      level: 'General' },
  { code: 'M101', name: 'Beginner Creative Problem Solving',     subject: 'Mathematics', level: 'Elementary' },
  { code: 'M102', name: 'Intermediate Creative Problem Solving', subject: 'Mathematics', level: 'MS' },
  { code: 'P101', name: 'AP Physics',                    subject: 'Physics',          level: 'HS' },
];

// teacher assignments per class (by teacher lastName)
const CLASS_TEACHERS = {
  W102: ['Clark', 'Kumar'],
  W101: ['Bergman'],
  T102: ['Mathur'],
  T101: ['Mathur'],
  M103: ['Agrawal'],
  M101: ['Keyal'],
  M102: ['Keyal'],
  P101: ['Maewal'],
};

// Sessions: { classCode, sessionCode, teacher, startUtc, endUtc }
// All dates 2026-06-09 to 2026-06-14 (week of Jun 9)
const SESSIONS = [
  // ── W102 Clark ───────────────────────────────────────────────────────────────
  // W1021: Fri 5:00–6:30PM PDT = Sat 00:00–01:30 UTC
  { classCode: 'W102', sessionCode: 'W1021', teacher: 'Clark',
    startUtc: '2026-06-13T00:00:00Z', endUtc: '2026-06-13T01:30:00Z' },
  // W1022: Sat 7:00–8:30AM PDT = Sat 14:00–15:30 UTC
  { classCode: 'W102', sessionCode: 'W1022', teacher: 'Clark',
    startUtc: '2026-06-13T14:00:00Z', endUtc: '2026-06-13T15:30:00Z' },
  // ── W102 Kumar ───────────────────────────────────────────────────────────────
  // W1023: Sun 6:30–8:00AM PDT = Sun 13:30–15:00 UTC
  { classCode: 'W102', sessionCode: 'W1023', teacher: 'Kumar',
    startUtc: '2026-06-14T13:30:00Z', endUtc: '2026-06-14T15:00:00Z' },

  // ── W101 Bergman ─────────────────────────────────────────────────────────────
  // W1011: Tue 5:30–7:00PM PDT = Wed 00:30–02:00 UTC
  { classCode: 'W101', sessionCode: 'W1011', teacher: 'Bergman',
    startUtc: '2026-06-10T00:30:00Z', endUtc: '2026-06-10T02:00:00Z' },
  // W1012: Sat 2:00–3:30PM PDT = Sat 21:00–22:30 UTC
  { classCode: 'W101', sessionCode: 'W1012', teacher: 'Bergman',
    startUtc: '2026-06-13T21:00:00Z', endUtc: '2026-06-13T22:30:00Z' },

  // ── T102 Mathur ───────────────────────────────────────────────────────────────
  // T1021: Sat 8:00–9:30AM PDT = Sat 15:00–16:30 UTC
  { classCode: 'T102', sessionCode: 'T1021', teacher: 'Mathur',
    startUtc: '2026-06-13T15:00:00Z', endUtc: '2026-06-13T16:30:00Z' },

  // ── T101 Mathur ───────────────────────────────────────────────────────────────
  // T1011: Sun 8:00–9:30AM PDT = Sun 15:00–16:30 UTC
  { classCode: 'T101', sessionCode: 'T1011', teacher: 'Mathur',
    startUtc: '2026-06-14T15:00:00Z', endUtc: '2026-06-14T16:30:00Z' },

  // ── M103 Agrawal ─────────────────────────────────────────────────────────────
  // M1031: Tue 5:00–6:30PM PDT = Wed 00:00–01:30 UTC
  { classCode: 'M103', sessionCode: 'M1031', teacher: 'Agrawal',
    startUtc: '2026-06-10T00:00:00Z', endUtc: '2026-06-10T01:30:00Z' },
  // M1032: Fri 8:00–9:30PM PDT = Sat 03:00–04:30 UTC
  { classCode: 'M103', sessionCode: 'M1032', teacher: 'Agrawal',
    startUtc: '2026-06-13T03:00:00Z', endUtc: '2026-06-13T04:30:00Z' },

  // ── M101 Keyal ───────────────────────────────────────────────────────────────
  // M1011: Tue 5:00–6:30PM PDT = Wed 00:00–01:30 UTC
  { classCode: 'M101', sessionCode: 'M1011', teacher: 'Keyal',
    startUtc: '2026-06-10T00:00:00Z', endUtc: '2026-06-10T01:30:00Z' },
  // M1012: Sat 7:00–8:30AM PDT = Sat 14:00–15:30 UTC
  { classCode: 'M101', sessionCode: 'M1012', teacher: 'Keyal',
    startUtc: '2026-06-13T14:00:00Z', endUtc: '2026-06-13T15:30:00Z' },

  // ── M102 Keyal ───────────────────────────────────────────────────────────────
  // M1021: Tue 7:00–8:30PM PDT = Wed 02:00–03:30 UTC
  { classCode: 'M102', sessionCode: 'M1021', teacher: 'Keyal',
    startUtc: '2026-06-10T02:00:00Z', endUtc: '2026-06-10T03:30:00Z' },
  // M1022: Sun 4:30–6:00PM PDT = Sun 23:30–Mon 01:00 UTC
  { classCode: 'M102', sessionCode: 'M1022', teacher: 'Keyal',
    startUtc: '2026-06-14T23:30:00Z', endUtc: '2026-06-15T01:00:00Z' },

  // ── P101 Maewal ──────────────────────────────────────────────────────────────
  // Tue 4:30–6:00PM PDT = Tue 23:30–Wed 01:00 UTC
  { classCode: 'P101', sessionCode: 'P1011', teacher: 'Maewal',
    startUtc: '2026-06-09T23:30:00Z', endUtc: '2026-06-10T01:00:00Z' },
];

// Human-readable PST time for the session title
const SESSION_LABELS = {
  W1021: 'Fridays 5:00–6:30 PM PDT',
  W1022: 'Saturdays 7:00–8:30 AM PDT',
  W1023: 'Sundays 6:30–8:00 AM PDT',
  W1011: 'Tuesdays 5:30–7:00 PM PDT',
  W1012: 'Saturdays 2:00–3:30 PM PDT',
  T1021: 'Saturdays 8:00–9:30 AM PDT',
  T1011: 'Sundays 8:00–9:30 AM PDT',
  M1031: 'Tuesdays 5:00–6:30 PM PDT',
  M1032: 'Fridays 8:00–9:30 PM PDT',
  M1011: 'Tuesdays 5:00–6:30 PM PDT',
  M1012: 'Saturdays 7:00–8:30 AM PDT',
  M1021: 'Tuesdays 7:00–8:30 PM PDT',
  M1022: 'Sundays 4:30–6:00 PM PDT',
  P1011: 'Tuesdays 4:30–6:00 PM PDT',
};

async function main() {
  console.log('Starting seed...\n');

  // 1. Get superadmin id
  const adminRow = await db.query(`SELECT id FROM users WHERE role = 'superadmin' LIMIT 1`);
  if (!adminRow.rows[0]) throw new Error('No superadmin found — run migrations first');
  const adminId = adminRow.rows[0].id;
  console.log(`Using superadmin id: ${adminId}`);

  // 2. Create teacher accounts
  const tempPassword = 'Teacher@123';
  const hash = await bcrypt.hash(tempPassword, 12);
  const teacherIds = {};

  for (const t of TEACHERS) {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [t.email]);
    if (existing.rows[0]) {
      teacherIds[t.lastName] = existing.rows[0].id;
      console.log(`  Teacher exists: ${t.email}`);
      continue;
    }
    const res = await db.query(
      `INSERT INTO users
         (name, email, password_hash, role, is_active, account_status,
          verification_status, must_change_password, contact_preference)
       VALUES ($1, $2, $3, 'teacher', TRUE, 'active', 'approved', TRUE, 'email')
       RETURNING id`,
      [t.lastName, t.email, hash]
    );
    teacherIds[t.lastName] = res.rows[0].id;
    console.log(`  Created teacher: ${t.email} (id: ${res.rows[0].id})`);
  }

  // 3. Create classes
  const classIds = {};
  for (const cls of CLASSES) {
    const existing = await db.query('SELECT id FROM classes WHERE code = $1', [cls.code]);
    if (existing.rows[0]) {
      classIds[cls.code] = existing.rows[0].id;
      console.log(`  Class exists: ${cls.code} — ${cls.name}`);
      continue;
    }
    const res = await db.query(
      `INSERT INTO classes (name, description, admin_id, subject, level, max_students, is_active, code)
       VALUES ($1, $2, $3, $4, $5, 30, TRUE, $6)
       RETURNING id`,
      [cls.name, `${cls.code} — ${cls.name}`, adminId, cls.subject, cls.level, cls.code]
    );
    classIds[cls.code] = res.rows[0].id;
    console.log(`  Created class: ${cls.code} — ${cls.name} (id: ${res.rows[0].id})`);
  }

  // 4. Assign teachers to classes
  for (const [classCode, lastNames] of Object.entries(CLASS_TEACHERS)) {
    const classId = classIds[classCode];
    for (const lastName of lastNames) {
      const teacherId = teacherIds[lastName];
      if (!teacherId) { console.warn(`  WARNING: no teacher id for ${lastName}`); continue; }
      await db.query(
        `INSERT INTO teacher_assignments (class_id, teacher_id, assigned_by)
         VALUES ($1, $2, $3) ON CONFLICT (class_id, teacher_id) DO NOTHING`,
        [classId, teacherId, adminId]
      );
      console.log(`  Assigned ${lastName} → ${classCode}`);
    }
  }

  // 5. Create sessions
  for (const sess of SESSIONS) {
    const classId  = classIds[sess.classCode];
    const teacherId = teacherIds[sess.teacher];
    if (!classId)   { console.warn(`  WARNING: no classId for ${sess.classCode}`); continue; }
    if (!teacherId) { console.warn(`  WARNING: no teacherId for ${sess.teacher}`);  continue; }

    const existing = await db.query(
      'SELECT id FROM class_schedules WHERE session_code = $1',
      [sess.sessionCode]
    );
    if (existing.rows[0]) {
      console.log(`  Session exists: ${sess.sessionCode}`);
      continue;
    }

    const label = SESSION_LABELS[sess.sessionCode] || sess.sessionCode;
    const title = `${sess.sessionCode} — ${label}`;

    await db.query(
      `INSERT INTO class_schedules
         (class_id, title, start_time, end_time, recurring_type, session_code, teacher_id)
       VALUES ($1, $2, $3, $4, 'weekly', $5, $6)`,
      [classId, title, sess.startUtc, sess.endUtc, sess.sessionCode, teacherId]
    );
    console.log(`  Created session: ${sess.sessionCode} (${sess.classCode} / ${sess.teacher})`);
  }

  console.log('\nSeed complete!');
  console.log(`\nTeacher login credentials (all share the same temp password):`);
  console.log(`  Password: ${tempPassword}  (each teacher must change on first login)\n`);
  for (const t of TEACHERS) {
    console.log(`  ${t.lastName.padEnd(10)} ${t.email}`);
  }

  await db.pool.end();
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
