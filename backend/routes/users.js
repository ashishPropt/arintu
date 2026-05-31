const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const emailSvc = require('../services/email');
const { createNotification } = require('../services/notifications');

const router = express.Router();

// GET /api/users - list users (filtered by role)
router.get('/', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let where = ['u.id != $1'];
  let params = [req.user.id];
  let idx = 2;

  // Admins can only see teachers and students
  if (req.user.role === 'admin') {
    where.push(`u.role IN ('teacher', 'student')`);
  }

  if (role) {
    where.push(`u.role = $${idx++}`);
    params.push(role);
  }
  if (search) {
    where.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const result = await db.query(
      `SELECT u.id, u.email, u.name, u.role, u.phone, u.is_active, u.created_at,
              r.name as region_name
       FROM users u
       LEFT JOIN regions r ON r.id = u.region_id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    const count = await db.query(
      `SELECT COUNT(*) FROM users u ${whereClause}`,
      params
    );

    res.json({ users: result.rows, total: parseInt(count.rows[0].count), page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users - create user
router.post(
  '/',
  authenticate,
  authorize('superadmin', 'admin'),
  [
    body('email').isEmail().normalizeEmail(),
    body('name').trim().notEmpty(),
    body('password').isLength({ min: 6 }),
    body('role').isIn(['admin', 'teacher', 'student']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, name, password, role, phone, regionId } = req.body;

    // Admins can only create teachers and students
    if (req.user.role === 'admin' && role === 'admin') {
      return res.status(403).json({ error: 'Admins cannot create other admins' });
    }

    try {
      const exists = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      if (exists.rows[0]) return res.status(409).json({ error: 'Email already in use' });

      const hash = await bcrypt.hash(password, 12);
      const result = await db.query(
        `INSERT INTO users (email, password_hash, name, role, phone, region_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, email, name, role, phone, is_active, created_at`,
        [email, hash, name, role, phone || null, regionId || null, req.user.id]
      );
      res.status(201).json(result.rows[0]);
    } catch {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── GET /api/users/pending-approval  (superadmin) ─────────────────────────────
// Returns admin and teacher accounts awaiting superadmin approval
// IMPORTANT: must be registered BEFORE /:id so Express doesn't match "pending-approval" as a UUID
router.get('/pending-approval', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, email, name, role, account_status, created_at
       FROM users
       WHERE account_status = 'pending' AND role IN ('admin', 'teacher')
       ORDER BY created_at ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:id
router.get('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  const result = await db.query(
    `SELECT u.id, u.email, u.name, u.role, u.phone, u.is_active, u.created_at,
            r.name as region_name, r.id as region_id
     FROM users u LEFT JOIN regions r ON r.id = u.region_id
     WHERE u.id = $1`,
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(result.rows[0]);
});

// PUT /api/users/:id
router.put('/:id', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  const { name, phone, regionId, isActive } = req.body;
  try {
    const result = await db.query(
      `UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone),
       region_id = COALESCE($3, region_id), is_active = COALESCE($4, is_active),
       updated_at = NOW()
       WHERE id = $5
       RETURNING id, email, name, role, phone, is_active`,
      [name, phone, regionId, isActive, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/users/:id (soft delete)
router.delete('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  await db.query('UPDATE users SET is_active = FALSE WHERE id = $1', [req.params.id]);
  res.json({ message: 'User deactivated' });
});

// ── PUT /api/users/:id/approve-account  (superadmin) ─────────────────────────
router.put('/:id/approve-account', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE users SET account_status = 'active', is_active = TRUE, updated_at = NOW()
       WHERE id = $1 AND account_status = 'pending'
       RETURNING id, email, name, role, account_status`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found or not pending' });

    const user = result.rows[0];

    // Notify in-app
    await createNotification({
      userId: user.id,
      title: 'Account approved',
      message: 'Your account has been approved by the super admin. You can now sign in.',
      type: 'info',
    });

    // Send email
    emailSvc.sendAccountApproved(user.email, user.name, user.role).catch(() => {});

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PUT /api/users/:id/reject-account  (superadmin) ──────────────────────────
router.put('/:id/reject-account', authenticate, authorize('superadmin'), async (req, res) => {
  const { notes } = req.body;
  try {
    const result = await db.query(
      `UPDATE users SET account_status = 'rejected', is_active = FALSE, updated_at = NOW()
       WHERE id = $1 AND account_status = 'pending'
       RETURNING id, email, name, role, account_status`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found or not pending' });

    const user = result.rows[0];
    emailSvc.sendAccountRejected(user.email, user.name, user.role, notes).catch(() => {});

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
