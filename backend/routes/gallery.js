/**
 * Gallery routes — community photo/video uploads with admin moderation.
 *
 * Public:  POST /api/gallery/upload  — no auth required; creates a pending item
 * Private: GET/PUT/DELETE /api/gallery/* — admin/superadmin only
 */
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');
const db      = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ── Storage ───────────────────────────────────────────────────────────────────
const GALLERY_DIR = path.join(__dirname, '..', 'uploads', 'gallery');
if (!fs.existsSync(GALLERY_DIR)) fs.mkdirSync(GALLERY_DIR, { recursive: true });

// Allowed mime types and their categories
const ALLOWED = {
  'image/jpeg':       { type: 'photo', ext: '.jpg'  },
  'image/png':        { type: 'photo', ext: '.png'  },
  'image/webp':       { type: 'photo', ext: '.webp' },
  'image/gif':        { type: 'photo', ext: '.gif'  },
  'video/mp4':        { type: 'video', ext: '.mp4'  },
  'video/quicktime':  { type: 'video', ext: '.mov'  },
  'video/webm':       { type: 'video', ext: '.webm' },
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, GALLERY_DIR),
  filename: (_req, file, cb) => {
    const info = ALLOWED[file.mimetype];
    const ext  = info ? info.ext : path.extname(file.originalname).toLowerCase();
    cb(null, `gallery_${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB hard cap (enforced per-type below)
  fileFilter: (_req, file, cb) => {
    if (ALLOWED[file.mimetype]) return cb(null, true);
    cb(new Error('Only JPG, PNG, WebP, GIF images and MP4, MOV, WebM videos are allowed'));
  },
});

// ── Simple in-memory rate limiter (per IP, 5 uploads / 15 min) ───────────────
const uploadCounts = new Map();
function rateLimit(req, res, next) {
  const ip  = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const entry = uploadCounts.get(ip) || { count: 0, resetAt: now + 15 * 60 * 1000 };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 15 * 60 * 1000; }
  if (entry.count >= 5) {
    const waitMin = Math.ceil((entry.resetAt - now) / 60000);
    return res.status(429).json({ error: `Too many uploads. Please wait ${waitMin} minute(s).` });
  }
  entry.count++;
  uploadCounts.set(ip, entry);
  next();
}

// ── Helper: delete file on disk ───────────────────────────────────────────────
function deleteFile(filePath) {
  if (!filePath) return;
  const abs = path.resolve(filePath);
  if (fs.existsSync(abs)) { try { fs.unlinkSync(abs); } catch {} }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC UPLOAD — no auth required
// POST /api/gallery/upload
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/upload',
  rateLimit,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          error: err.code === 'LIMIT_FILE_SIZE'
            ? 'File is too large. Maximum 200 MB for video, 15 MB for images.'
            : err.message,
        });
      }
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { title, description, uploader_name, uploader_email } = req.body;
    if (!uploader_name?.trim()) {
      deleteFile(req.file.path);
      return res.status(400).json({ error: 'Your name is required' });
    }
    if (!uploader_email?.trim() || !uploader_email.includes('@')) {
      deleteFile(req.file.path);
      return res.status(400).json({ error: 'A valid email address is required' });
    }

    const info = ALLOWED[req.file.mimetype];
    const fileType = info?.type || 'photo';

    // Per-type size enforcement: images max 15 MB
    if (fileType === 'photo' && req.file.size > 15 * 1024 * 1024) {
      deleteFile(req.file.path);
      return res.status(400).json({ error: 'Images must be under 15 MB' });
    }

    try {
      const result = await db.query(
        `INSERT INTO gallery_items
           (title, description, file_path, original_name, file_type, mime_type,
            file_size, uploader_name, uploader_email, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending')
         RETURNING id, title, status, created_at`,
        [
          title?.trim() || null,
          description?.trim() || null,
          req.file.path,
          req.file.originalname,
          fileType,
          req.file.mimetype,
          req.file.size,
          uploader_name.trim(),
          uploader_email.trim().toLowerCase(),
        ]
      );
      res.status(201).json({
        ok: true,
        id: result.rows[0].id,
        message: 'Thank you! Your submission is under review and will appear once approved.',
      });
    } catch (err) {
      deleteFile(req.file.path);
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN / SUPERADMIN — require auth
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/gallery — list items (optional ?status=pending|approved|rejected)
router.get('/', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  const { status } = req.query;
  try {
    const where  = status ? 'WHERE status = $1' : '';
    const params = status ? [status] : [];
    const result = await db.query(
      `SELECT id, title, description, file_type, mime_type, file_size,
              original_name, status, uploader_name, uploader_email,
              admin_notes, reviewed_at, created_at,
              reviewed_by
       FROM gallery_items
       ${where}
       ORDER BY created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/gallery/:id/file — admin preview (any status)
router.get('/:id/file', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT file_path, mime_type FROM gallery_items WHERE id = $1',
      [req.params.id]
    );
    const row = result.rows[0];
    if (!row) return res.status(404).end();
    const abs = path.resolve(row.file_path);
    if (!fs.existsSync(abs)) return res.status(404).end();
    res.setHeader('Content-Type', row.mime_type);
    // Support range requests for video
    const stat = fs.statSync(abs);
    const rangeHeader = req.headers.range;
    if (rangeHeader && row.mime_type.startsWith('video/')) {
      const parts   = rangeHeader.replace(/bytes=/, '').split('-');
      const start   = parseInt(parts[0], 10);
      const end     = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;
      res.writeHead(206, {
        'Content-Range':  `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges':  'bytes',
        'Content-Length': chunkSize,
        'Content-Type':   row.mime_type,
      });
      fs.createReadStream(abs, { start, end }).pipe(res);
    } else {
      res.setHeader('Content-Length', stat.size);
      fs.createReadStream(abs).pipe(res);
    }
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

// PUT /api/gallery/:id/review — approve or reject
router.put('/:id/review', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  const { action, admin_notes } = req.body; // action: 'approve' | 'reject'
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'action must be approve or reject' });
  }
  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  try {
    const result = await db.query(
      `UPDATE gallery_items
       SET status       = $1,
           admin_notes  = $2,
           reviewed_by  = $3,
           reviewed_at  = NOW()
       WHERE id = $4
       RETURNING id, status, admin_notes`,
      [newStatus, admin_notes || null, req.user.id, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/gallery/:id — delete item + file
router.delete('/:id', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const row = await db.query('SELECT file_path FROM gallery_items WHERE id = $1', [req.params.id]);
    if (!row.rows[0]) return res.status(404).json({ error: 'Not found' });
    deleteFile(row.rows[0].file_path);
    await db.query('DELETE FROM gallery_items WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
