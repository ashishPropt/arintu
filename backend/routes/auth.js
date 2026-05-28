const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    try {
      const result = await db.query(
        'SELECT id, email, password_hash, name, role, region_id, is_active FROM users WHERE email = $1',
        [email]
      );
      const user = result.rows[0];
      if (!user || !user.is_active) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      });

      res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role, regionId: user.region_id },
      });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// POST /api/auth/register  (public — students only)
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { name, email, password } = req.body;
    try {
      // Check email not already taken
      const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }

      const hash = await bcrypt.hash(password, 12);
      const result = await db.query(
        `INSERT INTO users (name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, 'student', true) RETURNING id, email, name, role`,
        [name, email, hash]
      );
      const user = result.rows[0];

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      });

      res.status(201).json({ token, user });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const result = await db.query(
    `SELECT u.id, u.email, u.name, u.role, u.phone, u.avatar_url, u.region_id,
            u.fee_waiver_status,
            r.name as region_name
     FROM users u LEFT JOIN regions r ON r.id = u.region_id
     WHERE u.id = $1`,
    [req.user.id]
  );
  res.json(result.rows[0]);
});

// POST /api/auth/change-password
router.post(
  '/change-password',
  authenticate,
  [body('currentPassword').notEmpty(), body('newPassword').isLength({ min: 6 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { currentPassword, newPassword } = req.body;
    try {
      const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
      const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
      if (!valid) return res.status(400).json({ error: 'Current password incorrect' });

      const hash = await bcrypt.hash(newPassword, 12);
      await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
      res.json({ message: 'Password updated' });
    } catch {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
