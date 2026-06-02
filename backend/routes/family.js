/**
 * Family routes — parent ↔ child linking
 *
 * GET  /api/family/children                         — parent: list my children
 * GET  /api/family/parent                           — student: get my parent
 * GET  /api/family/children/:childId/applications  — parent: view child's applications
 * POST /api/family/add-child                        — parent: link or create child account
 * POST /api/family/add-parent                       — student: link or create parent account
 */
const express  = require('express');
const crypto   = require('crypto');
const bcrypt   = require('bcryptjs');
const db       = require('../database/db');
const { authenticate } = require('../middleware/auth');
const emailSvc = require('../services/email');

const router = express.Router();

function generateTempPassword() {
  // 10-char URL-safe base64 — readable, no ambiguous chars
  return crypto.randomBytes(8).toString('base64url').slice(0, 10);
}

// ── GET /api/family/children ──────────────────────────────────────────────────
router.get('/children', authenticate, async (req, res) => {
  if (req.user.role !== 'parent') {
    return res.status(403).json({ error: 'Only parents can view children' });
  }
  try {
    const result = await db.query(
      `SELECT id, name, email, account_status, verification_status,
              (SELECT COUNT(*) FROM class_applications ca WHERE ca.student_id = u.id) AS application_count
       FROM users u
       WHERE parent_id = $1 AND role = 'student'
       ORDER BY name`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/family/parent ────────────────────────────────────────────────────
router.get('/parent', authenticate, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can view their parent' });
  }
  try {
    const me = await db.query('SELECT parent_id FROM users WHERE id = $1', [req.user.id]);
    const parentId = me.rows[0]?.parent_id;
    if (!parentId) return res.json(null);
    const parent = await db.query(
      'SELECT id, name, email, account_status, verification_status FROM users WHERE id = $1',
      [parentId]
    );
    res.json(parent.rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/family/children/:childId/classes ─────────────────────────────────
router.get('/children/:childId/classes', authenticate, async (req, res) => {
  if (req.user.role !== 'parent') {
    return res.status(403).json({ error: 'Parents only' });
  }
  try {
    const child = await db.query(
      'SELECT id FROM users WHERE id = $1 AND parent_id = $2',
      [req.params.childId, req.user.id]
    );
    if (!child.rows[0]) return res.status(404).json({ error: 'Child not found or not linked to your account' });

    const result = await db.query(
      `SELECT e.id, e.enrolled_at, e.status,
              c.id AS class_id, c.name AS class_name, c.subject, c.description, c.is_active
       FROM enrollments e
       JOIN classes c ON c.id = e.class_id
       WHERE e.student_id = $1
       ORDER BY c.name`,
      [req.params.childId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/family/children/:childId/schedule ────────────────────────────────
router.get('/children/:childId/schedule', authenticate, async (req, res) => {
  if (req.user.role !== 'parent') {
    return res.status(403).json({ error: 'Parents only' });
  }
  try {
    const child = await db.query(
      'SELECT id FROM users WHERE id = $1 AND parent_id = $2',
      [req.params.childId, req.user.id]
    );
    if (!child.rows[0]) return res.status(404).json({ error: 'Child not found or not linked to your account' });

    const result = await db.query(
      `SELECT cs.id, cs.title, cs.start_time, cs.end_time,
              cs.zoom_join_url, cs.notes, cs.recurring_type,
              c.name AS class_name, c.subject
       FROM class_schedules cs
       JOIN classes      c  ON c.id  = cs.class_id
       JOIN enrollments  e  ON e.class_id = cs.class_id AND e.student_id = $1
       WHERE cs.start_time >= NOW()
       ORDER BY cs.start_time ASC
       LIMIT 30`,
      [req.params.childId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/family/children/:childId/applications ────────────────────────────
router.get('/children/:childId/applications', authenticate, async (req, res) => {
  if (req.user.role !== 'parent') {
    return res.status(403).json({ error: 'Parents only' });
  }
  try {
    const child = await db.query(
      'SELECT id FROM users WHERE id = $1 AND parent_id = $2',
      [req.params.childId, req.user.id]
    );
    if (!child.rows[0]) return res.status(404).json({ error: 'Child not found or not linked to your account' });

    const result = await db.query(
      `SELECT ca.*, cl.name AS class_name, cl.subject
       FROM class_applications ca
       JOIN classes cl ON cl.id = ca.class_id
       WHERE ca.student_id = $1
       ORDER BY ca.created_at DESC`,
      [req.params.childId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/family/add-child ────────────────────────────────────────────────
router.post('/add-child', authenticate, async (req, res) => {
  if (req.user.role !== 'parent') {
    return res.status(403).json({ error: 'Only parents can add children' });
  }
  if (req.user.account_status !== 'active') {
    return res.status(403).json({ error: 'Your account must be verified and active before adding family members' });
  }

  const { email, name, phone } = req.body;
  if (!email?.trim()) return res.status(400).json({ error: 'Child email is required' });

  const normalEmail = email.toLowerCase().trim();

  try {
    const existing = await db.query(
      'SELECT id, name, email, role, parent_id, account_status FROM users WHERE email = $1',
      [normalEmail]
    );

    if (existing.rows[0]) {
      const child = existing.rows[0];
      if (child.role !== 'student') {
        return res.status(400).json({ error: 'That email belongs to an account that is not a student' });
      }
      if (child.parent_id) {
        return res.status(409).json({ error: 'That student already has a parent linked on Arintu' });
      }
      if (child.id === req.user.id) {
        return res.status(400).json({ error: 'You cannot add yourself as a child' });
      }

      await db.query('UPDATE users SET parent_id = $1, updated_at = NOW() WHERE id = $2', [req.user.id, child.id]);

      const parentRow = await db.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
      emailSvc.sendFamilyLinked({
        toEmail: child.email, toName: child.name,
        byName: parentRow.rows[0].name, role: 'parent',
      }).catch(() => {});

      return res.json({ linked: true, created: false, user: { id: child.id, name: child.name, email: child.email } });
    }

    // New child — name is required
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Child name is required to create a new account' });
    }

    const parentRow = await db.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    const parentName = parentRow.rows[0]?.name || null;

    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 12);

    const newUser = await db.query(
      `INSERT INTO users
         (name, email, password_hash, role, is_active, account_status,
          verification_status, must_change_password, parent_id, parent_name,
          parent_email, contact_preference)
       VALUES ($1, $2, $3, 'student', FALSE, 'pending', 'pending', TRUE, $4, $5, $6, 'email')
       RETURNING id, name, email, account_status`,
      [name.trim(), normalEmail, hash, req.user.id, parentName,
       (await db.query('SELECT email FROM users WHERE id = $1', [req.user.id])).rows[0].email]
    );
    const child = newUser.rows[0];

    emailSvc.sendFamilyWelcome({
      toEmail: normalEmail, toName: name.trim(),
      byName: parentName, addedAs: 'child',
      tempPassword,
    }).catch(() => {});

    res.status(201).json({ linked: false, created: true, user: child });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/family/add-parent ───────────────────────────────────────────────
router.post('/add-parent', authenticate, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can add a parent' });
  }
  if (req.user.account_status !== 'active') {
    return res.status(403).json({ error: 'Your account must be verified and active before adding family members' });
  }

  const { email, name, phone } = req.body;
  if (!email?.trim()) return res.status(400).json({ error: 'Parent email is required' });

  // Student must not already have a parent
  const me = await db.query('SELECT parent_id FROM users WHERE id = $1', [req.user.id]);
  if (me.rows[0]?.parent_id) {
    return res.status(409).json({ error: 'You already have a parent linked. Contact support to update your family link.' });
  }

  const normalEmail = email.toLowerCase().trim();

  try {
    const existing = await db.query(
      'SELECT id, name, email, role, account_status FROM users WHERE email = $1',
      [normalEmail]
    );

    if (existing.rows[0]) {
      const parent = existing.rows[0];
      if (parent.role !== 'parent') {
        return res.status(400).json({ error: 'That email belongs to an account that is not a parent' });
      }
      if (parent.id === req.user.id) {
        return res.status(400).json({ error: 'You cannot add yourself as a parent' });
      }

      await db.query('UPDATE users SET parent_id = $1, updated_at = NOW() WHERE id = $2', [parent.id, req.user.id]);

      const studentRow = await db.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
      emailSvc.sendFamilyLinked({
        toEmail: parent.email, toName: parent.name,
        byName: studentRow.rows[0].name, role: 'child',
      }).catch(() => {});

      return res.json({ linked: true, created: false, user: { id: parent.id, name: parent.name, email: parent.email } });
    }

    // New parent — name is required
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Parent name is required to create a new account' });
    }

    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 12);

    const newUser = await db.query(
      `INSERT INTO users
         (name, email, password_hash, role, is_active, account_status,
          verification_status, must_change_password, contact_preference)
       VALUES ($1, $2, $3, 'parent', FALSE, 'pending', 'pending', TRUE, 'email')
       RETURNING id, name, email, account_status`,
      [name.trim(), normalEmail, hash]
    );
    const parent = newUser.rows[0];

    // Link student → new parent
    await db.query('UPDATE users SET parent_id = $1, updated_at = NOW() WHERE id = $2', [parent.id, req.user.id]);

    const studentRow = await db.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    emailSvc.sendFamilyWelcome({
      toEmail: normalEmail, toName: name.trim(),
      byName: studentRow.rows[0].name, addedAs: 'parent',
      tempPassword,
    }).catch(() => {});

    res.status(201).json({ linked: false, created: true, user: parent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
