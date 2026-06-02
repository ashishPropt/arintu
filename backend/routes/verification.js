/**
 * Student ID verification routes
 *
 * Student:
 *   POST /api/verification/upload-id  — upload ID document (JPG/PNG/PDF, max 5 MB)
 *   GET  /api/verification/status     — get own verification status
 *
 * Admin / Superadmin:
 *   GET  /api/verification            — list student verifications (filter by status)
 *   GET  /api/verification/:userId/id-proof  — stream the private ID file
 *   PUT  /api/verification/:userId/approve   — approve student
 *   PUT  /api/verification/:userId/reject    — reject with optional notes
 */
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const emailSvc = require('../services/email');
const { createNotification } = require('../services/notifications');

const router = express.Router();

// ── File storage setup ────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'student-ids');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.user.id}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPG, PNG, and PDF files are allowed'));
  },
});

// ── POST /api/verification/upload-id  (any authenticated user — re-upload after rejection) ──
router.post(
  '/upload-id',
  authenticate,
  (req, res, next) => {
    upload.single('id_document')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File must be under 5 MB' : err.message });
      }
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const studentId = req.user.id;

    try {
      // If there was a previous file, delete it
      const prev = await db.query('SELECT id_document_path FROM users WHERE id = $1', [studentId]);
      const oldPath = prev.rows[0]?.id_document_path;
      if (oldPath && fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch { /* ignore */ }
      }

      // Reset to 'pending' on re-submit (per spec)
      await db.query(
        `UPDATE users SET
           id_document_path        = $1,
           id_document_uploaded_at = NOW(),
           verification_status     = 'pending',
           verification_notes      = NULL,
           verification_reviewed_by = NULL,
           verification_reviewed_at = NULL,
           updated_at = NOW()
         WHERE id = $2`,
        [req.file.path, studentId]
      );

      res.json({
        message: 'ID document uploaded. Your verification is pending admin review.',
        verification_status: 'pending',
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── GET /api/verification/status  (any authenticated user — own status) ───────
router.get('/status', authenticate, async (req, res) => {
  const result = await db.query(
    `SELECT verification_status, id_document_uploaded_at, verification_notes
     FROM users WHERE id = $1`,
    [req.user.id]
  );
  res.json(result.rows[0] || {});
});

// ── GET /api/verification  (admin/superadmin — list all pending IDs) ─────────
router.get('/', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  const { status } = req.query;
  // Show all non-superadmin users who have uploaded an ID document
  let where = ["u.role NOT IN ('admin', 'superadmin')", 'u.id_document_path IS NOT NULL'];
  let params = [];
  let idx = 1;

  if (status) {
    where.push(`u.verification_status = $${idx++}`);
    params.push(status);
  }

  try {
    const result = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.account_status, u.verification_status,
              u.id_document_uploaded_at, u.verification_notes,
              r.name as reviewer_name
       FROM users u
       LEFT JOIN users r ON r.id = u.verification_reviewed_by
       WHERE ${where.join(' AND ')}
       ORDER BY
         CASE u.verification_status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END,
         u.id_document_uploaded_at ASC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/verification/:userId/id-proof  (admin/superadmin — protected file) ─
router.get('/:userId/id-proof', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id_document_path, name FROM users WHERE id = $1',
      [req.params.userId]
    );
    const user = result.rows[0];
    if (!user || !user.id_document_path) {
      return res.status(404).json({ error: 'No ID document found for this student' });
    }
    const filePath = user.id_document_path;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }
    res.sendFile(path.resolve(filePath));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PUT /api/verification/:userId/approve  (admin/superadmin) ─────────────────
router.put('/:userId/approve', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE users SET
         verification_status      = 'approved',
         verification_notes       = NULL,
         verification_reviewed_by = $1,
         verification_reviewed_at = NOW(),
         account_status           = 'active',
         is_active                = TRUE,
         updated_at               = NOW()
       WHERE id = $2 AND role NOT IN ('admin', 'superadmin')
       RETURNING id, name, email, role, verification_status, account_status`,
      [req.user.id, req.params.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });

    const usr = result.rows[0];

    await createNotification({
      userId: usr.id,
      title: 'ID Verification approved — account active',
      message: 'Your identity has been verified and your account is now active. Welcome to Arintu!',
      type: 'info',
    });

    emailSvc.sendVerificationApproved(usr.email, usr.name).catch(() => {});

    res.json(usr);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PUT /api/verification/:userId/reject  (admin/superadmin) ──────────────────
router.put('/:userId/reject', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  const { notes } = req.body;
  try {
    const result = await db.query(
      `UPDATE users SET
         verification_status     = 'rejected',
         verification_notes      = $1,
         verification_reviewed_by = $2,
         verification_reviewed_at = NOW(),
         updated_at = NOW()
       WHERE id = $3 AND role NOT IN ('admin', 'superadmin')
       RETURNING id, name, email, role, verification_status`,
      [notes || null, req.user.id, req.params.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });

    const usr = result.rows[0];

    await createNotification({
      userId: usr.id,
      title: 'ID Verification not approved',
      message: `Your ID document was not approved.${notes ? ' Reason: ' + notes : ''} Please sign in and re-upload a clear, valid government-issued ID.`,
      type: 'info',
    });

    emailSvc.sendVerificationRejected(usr.email, usr.name, notes).catch(() => {});

    res.json(usr);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
