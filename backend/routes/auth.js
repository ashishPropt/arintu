const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authenticate } = require('../middleware/auth');
const email = require('../services/email');

const router = express.Router();

// ── POST /api/auth/login ───────────────────────────────────────────────────────
router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email: emailAddr, password } = req.body;
    try {
      const result = await db.query(
        `SELECT id, email, password_hash, name, role, region_id, is_active,
                account_status, verification_status, fee_waiver_status
         FROM users WHERE email = $1`,
        [emailAddr]
      );
      const user = result.rows[0];

      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      // Specific messages for pending/rejected accounts before password check
      if (user.account_status === 'pending') {
        return res.status(403).json({
          error: 'Your account is pending approval by the super admin. You will receive an email once approved.',
          code: 'ACCOUNT_PENDING',
        });
      }
      if (user.account_status === 'rejected') {
        return res.status(403).json({
          error: 'Your account application was not approved. Please contact infoenfinitty@gmail.com for assistance.',
          code: 'ACCOUNT_REJECTED',
        });
      }
      if (!user.is_active) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      });

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          regionId: user.region_id,
          verificationStatus: user.verification_status,
          feeWaiverStatus: user.fee_waiver_status,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── POST /api/auth/register ───────────────────────────────────────────────────
// Public — supports: student (active), parent (active), teacher/admin (pending approval)
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['student', 'parent', 'teacher', 'admin'])
      .withMessage('Invalid role'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { name, email: emailAddr, password, role: requestedRole = 'student', parentId } = req.body;
    const role = requestedRole;

    // superadmin cannot self-register
    if (role === 'superadmin') {
      return res.status(400).json({ error: 'Invalid role' });
    }

    try {
      const existing = await db.query('SELECT id FROM users WHERE email = $1', [emailAddr]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }

      const hash = await bcrypt.hash(password, 12);

      // admin and teacher go into pending state — superadmin must approve
      const needsApproval = role === 'admin' || role === 'teacher';
      const isActive = !needsApproval;
      const accountStatus = needsApproval ? 'pending' : 'active';

      // Validate parentId if provided (for student linking to parent account)
      let validatedParentId = null;
      if (parentId) {
        const parent = await db.query(
          "SELECT id FROM users WHERE id = $1 AND role = 'parent'",
          [parentId]
        );
        if (parent.rows[0]) validatedParentId = parentId;
      }

      const result = await db.query(
        `INSERT INTO users (name, email, password_hash, role, is_active, account_status, parent_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, email, name, role, account_status`,
        [name, emailAddr, hash, role, isActive, accountStatus, validatedParentId]
      );
      const user = result.rows[0];

      if (needsApproval) {
        // Don't issue a token — account needs superadmin approval first
        return res.status(201).json({
          pending: true,
          message: `Your ${role} account has been created and is pending approval by the super admin. You will receive an email once approved.`,
        });
      }

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      });

      res.status(201).json({ token, user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  const result = await db.query(
    `SELECT u.id, u.email, u.name, u.role, u.phone, u.avatar_url, u.region_id,
            u.fee_waiver_status, u.verification_status, u.account_status,
            u.id_document_uploaded_at, u.verification_notes,
            r.name as region_name
     FROM users u LEFT JOIN regions r ON r.id = u.region_id
     WHERE u.id = $1`,
    [req.user.id]
  );
  res.json(result.rows[0]);
});

// ── POST /api/auth/change-password ────────────────────────────────────────────
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

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Valid email required' });

    const { email: emailAddr } = req.body;

    // Always respond with the same message to prevent email enumeration
    const SAFE_RESPONSE = {
      message: "If an account exists with that email, you'll receive password reset instructions shortly.",
    };

    try {
      const result = await db.query(
        "SELECT id, name, is_active FROM users WHERE email = $1",
        [emailAddr]
      );
      const user = result.rows[0];

      if (!user || !user.is_active) return res.json(SAFE_RESPONSE);

      // Invalidate any existing tokens for this user
      await db.query(
        'DELETE FROM password_reset_tokens WHERE user_id = $1',
        [user.id]
      );

      // Generate a secure random token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, token, expiresAt]
      );

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
      await email.sendPasswordReset(emailAddr, user.name, resetUrl);

      res.json(SAFE_RESPONSE);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── POST /api/auth/reset-password ─────────────────────────────────────────────
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { token, newPassword } = req.body;
    try {
      const result = await db.query(
        `SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, u.name, u.email
         FROM password_reset_tokens prt
         JOIN users u ON u.id = prt.user_id
         WHERE prt.token = $1`,
        [token]
      );
      const record = result.rows[0];

      if (!record) return res.status(400).json({ error: 'Invalid or expired reset link.' });
      if (record.used_at) return res.status(400).json({ error: 'This reset link has already been used.' });
      if (new Date() > new Date(record.expires_at)) {
        return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
      }

      const hash = await bcrypt.hash(newPassword, 12);
      await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, record.user_id]);
      await db.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [record.id]);

      res.json({ message: 'Password reset successfully. You can now sign in with your new password.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── GET /api/auth/verify-reset-token ──────────────────────────────────────────
// Quick check whether a token is valid before showing the reset form
router.get('/verify-reset-token', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ valid: false });

  const result = await db.query(
    'SELECT id, expires_at, used_at FROM password_reset_tokens WHERE token = $1',
    [token]
  );
  const record = result.rows[0];
  if (!record || record.used_at || new Date() > new Date(record.expires_at)) {
    return res.json({ valid: false });
  }
  res.json({ valid: true });
});

module.exports = router;
