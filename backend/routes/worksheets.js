/**
 * Worksheets / quizzes / assignments
 *
 * Admin/Teacher:
 *   GET    /api/worksheets?classId=   — list all for a class
 *   POST   /api/worksheets            — create (with optional PDF/file upload)
 *   PUT    /api/worksheets/:id        — update metadata or publish
 *   DELETE /api/worksheets/:id        — delete (removes file too)
 *
 * Students / Teachers (enrolled/assigned):
 *   GET    /api/worksheets?classId=   — list published worksheets for a class
 *   GET    /api/worksheets/:id/download — download/stream the file
 */
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ── File storage ──────────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'worksheets');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-z0-9]/gi, '_')
      .slice(0, 40);
    cb(null, `ws_${Date.now()}_${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only PDF, Word, JPG, and PNG files are allowed'));
  },
});

// ── Helper: check class access ─────────────────────────────────────────────────
async function hasClassAccess(userId, role, classId) {
  if (role === 'superadmin') return true;
  if (role === 'admin') {
    const r = await db.query('SELECT id FROM classes WHERE id = $1 AND admin_id = $2', [classId, userId]);
    return r.rows.length > 0;
  }
  if (role === 'teacher') {
    const r = await db.query('SELECT id FROM teacher_assignments WHERE class_id = $1 AND teacher_id = $2', [classId, userId]);
    return r.rows.length > 0;
  }
  if (role === 'student') {
    const r = await db.query('SELECT id FROM enrollments WHERE class_id = $1 AND student_id = $2', [classId, userId]);
    return r.rows.length > 0;
  }
  return false;
}

// ── GET /api/worksheets?classId= ──────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  const { classId } = req.query;
  if (!classId) return res.status(400).json({ error: 'classId is required' });

  const { id: userId, role } = req.user;

  if (!(await hasClassAccess(userId, role, classId))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    // Students only see published worksheets; admins/teachers see all
    const isStudent = role === 'student';
    const result = await db.query(
      `SELECT w.*, u.name as created_by_name
       FROM worksheets w
       LEFT JOIN users u ON u.id = w.created_by
       WHERE w.class_id = $1 ${isStudent ? 'AND w.is_published = TRUE' : ''}
       ORDER BY w.created_at DESC`,
      [classId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/worksheets  (admin/teacher) ─────────────────────────────────────
router.post(
  '/',
  authenticate,
  authorize('admin', 'superadmin', 'teacher'),
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File must be under 10 MB' : err.message });
      }
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  async (req, res) => {
    const { classId, title, description, type, dueDate, isPublished } = req.body;
    if (!classId || !title) return res.status(400).json({ error: 'classId and title are required' });

    const { id: userId, role } = req.user;

    if (!(await hasClassAccess(userId, role, classId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    try {
      const result = await db.query(
        `INSERT INTO worksheets
           (class_id, title, description, type, due_date, is_published,
            file_path, file_name, file_size, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          classId,
          title.trim(),
          description || null,
          type || 'worksheet',
          dueDate || null,
          isPublished === 'true' || isPublished === true,
          req.file?.path || null,
          req.file?.originalname || null,
          req.file?.size || null,
          userId,
        ]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── PUT /api/worksheets/:id  (admin/teacher) ──────────────────────────────────
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'superadmin', 'teacher'),
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File must be under 10 MB' : err.message });
      }
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  async (req, res) => {
    const { title, description, type, dueDate, isPublished } = req.body;
    const { id: userId, role } = req.user;

    try {
      const existing = await db.query('SELECT * FROM worksheets WHERE id = $1', [req.params.id]);
      if (!existing.rows[0]) return res.status(404).json({ error: 'Worksheet not found' });

      const ws = existing.rows[0];
      if (!(await hasClassAccess(userId, role, ws.class_id))) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Replace file if a new one was uploaded
      let filePath = ws.file_path;
      let fileName = ws.file_name;
      let fileSize = ws.file_size;
      if (req.file) {
        if (filePath && fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch { /* ignore */ }
        }
        filePath = req.file.path;
        fileName = req.file.originalname;
        fileSize = req.file.size;
      }

      const result = await db.query(
        `UPDATE worksheets SET
           title = COALESCE($1, title),
           description = COALESCE($2, description),
           type = COALESCE($3, type),
           due_date = COALESCE($4, due_date),
           is_published = COALESCE($5, is_published),
           file_path = $6, file_name = $7, file_size = $8,
           updated_at = NOW()
         WHERE id = $9
         RETURNING *`,
        [
          title?.trim() || null,
          description || null,
          type || null,
          dueDate || null,
          isPublished !== undefined ? (isPublished === 'true' || isPublished === true) : null,
          filePath,
          fileName,
          fileSize,
          req.params.id,
        ]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── DELETE /api/worksheets/:id  (admin/teacher) ───────────────────────────────
router.delete('/:id', authenticate, authorize('admin', 'superadmin', 'teacher'), async (req, res) => {
  const { id: userId, role } = req.user;
  try {
    const existing = await db.query('SELECT * FROM worksheets WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Worksheet not found' });

    const ws = existing.rows[0];
    if (!(await hasClassAccess(userId, role, ws.class_id))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete the file from disk
    if (ws.file_path && fs.existsSync(ws.file_path)) {
      try { fs.unlinkSync(ws.file_path); } catch { /* ignore */ }
    }

    await db.query('DELETE FROM worksheets WHERE id = $1', [req.params.id]);
    res.json({ message: 'Worksheet deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/worksheets/:id/download  (authenticated) ────────────────────────
router.get('/:id/download', authenticate, async (req, res) => {
  const { id: userId, role } = req.user;
  try {
    const result = await db.query('SELECT * FROM worksheets WHERE id = $1', [req.params.id]);
    const ws = result.rows[0];
    if (!ws) return res.status(404).json({ error: 'Worksheet not found' });

    // Students can only download published worksheets
    if (role === 'student' && !ws.is_published) {
      return res.status(403).json({ error: 'Worksheet not available' });
    }

    if (!(await hasClassAccess(userId, role, ws.class_id))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!ws.file_path || !fs.existsSync(ws.file_path)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(path.resolve(ws.file_path), ws.file_name || 'worksheet');
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
