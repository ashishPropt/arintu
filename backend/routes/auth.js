const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authenticate } = require('../middleware/auth');
const email = require('../services/email');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

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
                account_status, verification_status, fee_waiver_status,
                totp_enabled
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

      // If 2FA is enabled, issue a short-lived pending token instead of the full JWT
      if (user.totp_enabled) {
        const pendingToken = jwt.sign(
          { userId: user.id, pending2fa: true },
          process.env.JWT_SECRET,
          { expiresIn: '10m' }
        );
        return res.json({ require2fa: true, pendingToken });
      }

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
    body('parentName').if(body('role').equals('student')).trim().notEmpty()
      .withMessage('Parent/guardian name is required for student accounts'),
    body('parentEmail').if(body('role').equals('student')).isEmail()
      .withMessage('A valid parent/guardian email is required for student accounts'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const {
      name, email: emailAddr, password, role: requestedRole = 'student', parentId,
      parentName, parentEmail, parentPhone,
      contactPreference,
    } = req.body;
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
        `INSERT INTO users (name, email, password_hash, role, is_active, account_status, parent_id,
                            parent_name, parent_email, parent_phone, contact_preference)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, email, name, role, account_status`,
        [name, emailAddr, hash, role, isActive, accountStatus, validatedParentId,
         role === 'student' ? (parentName || null) : null,
         role === 'student' ? (parentEmail || null) : null,
         role === 'student' ? (parentPhone || null) : null,
         contactPreference || 'email']
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

// ── POST /api/auth/2fa/verify  (called during login when 2FA is required) ─────
// Client sends the pending token from login + a 6-digit TOTP code.
router.post('/2fa/verify', async (req, res) => {
  const { pendingToken, code } = req.body;
  if (!pendingToken || !code) return res.status(400).json({ error: 'Token and code are required' });

  try {
    let payload;
    try {
      payload = jwt.verify(pendingToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
    }
    if (!payload.pending2fa) return res.status(400).json({ error: 'Invalid token type' });

    const result = await db.query(
      `SELECT id, email, name, role, region_id, verification_status,
              fee_waiver_status, totp_secret, totp_enabled
       FROM users WHERE id = $1`,
      [payload.userId]
    );
    const user = result.rows[0];
    if (!user || !user.totp_enabled || !user.totp_secret) {
      return res.status(400).json({ error: '2FA not configured for this account' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.totp_secret,
      encoding: 'base32',
      token: code.replace(/\s/g, ''),
      window: 1, // allow 30s clock drift
    });
    if (!verified) return res.status(401).json({ error: 'Invalid verification code. Please try again.' });

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
});

// ── POST /api/auth/2fa/setup  (generate secret + QR for authenticated user) ───
router.post('/2fa/setup', authenticate, async (req, res) => {
  try {
    const userRes = await db.query('SELECT email, name FROM users WHERE id = $1', [req.user.id]);
    const user = userRes.rows[0];

    const secret = speakeasy.generateSecret({
      name: `Arintu (${user.email})`,
      issuer: 'Arintu',
      length: 20,
    });

    // Store temp secret (not yet active until confirmed)
    await db.query(
      'UPDATE users SET totp_temp_secret = $1 WHERE id = $2',
      [secret.base32, req.user.id]
    );

    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
      qrCode: qrDataUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/2fa/enable  (confirm + activate after scanning QR) ─────────
router.post('/2fa/enable', authenticate, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Verification code is required' });

  try {
    const userRes = await db.query(
      'SELECT totp_temp_secret, totp_enabled FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userRes.rows[0];
    if (!user.totp_temp_secret) {
      return res.status(400).json({ error: 'No 2FA setup in progress. Call /2fa/setup first.' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.totp_temp_secret,
      encoding: 'base32',
      token: code.replace(/\s/g, ''),
      window: 1,
    });
    if (!verified) return res.status(400).json({ error: 'Invalid code. Please try again with your authenticator app.' });

    await db.query(
      'UPDATE users SET totp_secret = totp_temp_secret, totp_temp_secret = NULL, totp_enabled = TRUE WHERE id = $1',
      [req.user.id]
    );

    res.json({ message: 'Two-factor authentication has been enabled.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/2fa/disable  (disable with password + current TOTP code) ───
router.post('/2fa/disable', authenticate, async (req, res) => {
  const { password, code } = req.body;
  if (!password || !code) {
    return res.status(400).json({ error: 'Password and current 2FA code are required' });
  }

  try {
    const userRes = await db.query(
      'SELECT password_hash, totp_secret, totp_enabled FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userRes.rows[0];

    if (!user.totp_enabled) {
      return res.status(400).json({ error: '2FA is not currently enabled.' });
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) return res.status(400).json({ error: 'Incorrect password' });

    const totpValid = speakeasy.totp.verify({
      secret: user.totp_secret,
      encoding: 'base32',
      token: code.replace(/\s/g, ''),
      window: 1,
    });
    if (!totpValid) return res.status(400).json({ error: 'Invalid 2FA code' });

    await db.query(
      'UPDATE users SET totp_secret = NULL, totp_temp_secret = NULL, totp_enabled = FALSE WHERE id = $1',
      [req.user.id]
    );

    res.json({ message: 'Two-factor authentication has been disabled.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/auth/2fa/status  ─────────────────────────────────────────────────
router.get('/2fa/status', authenticate, async (req, res) => {
  const result = await db.query(
    'SELECT totp_enabled FROM users WHERE id = $1',
    [req.user.id]
  );
  res.json({ enabled: result.rows[0]?.totp_enabled || false });
});

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
