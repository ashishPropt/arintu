/**
 * Content management routes — team, cities, book submissions.
 * CRUD is superadmin-only; book submissions are open to any authenticated user.
 */
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { authenticate, authorize } = require('../middleware/auth');
const requireAuth = authenticate;
const requireRole = (...roles) => authorize(...roles);
const db = require('../database/db');

// ── Team photo upload storage ─────────────────────────────────────────────────
const TEAM_PHOTO_DIR = path.join(__dirname, '..', 'uploads', 'team-photos');
if (!fs.existsSync(TEAM_PHOTO_DIR)) fs.mkdirSync(TEAM_PHOTO_DIR, { recursive: true });

// ── Teacher profile photo upload storage ──────────────────────────────────────
const TEACHER_PHOTO_DIR = path.join(__dirname, '..', 'uploads', 'teacher-photos');
if (!fs.existsSync(TEACHER_PHOTO_DIR)) fs.mkdirSync(TEACHER_PHOTO_DIR, { recursive: true });

const teamPhotoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TEAM_PHOTO_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `team_${req.params.id}_${Date.now()}${ext}`);
  },
});

const teamPhotoUpload = multer({
  storage: teamPhotoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPG, PNG, WebP, or GIF images are allowed'));
  },
});

const teacherPhotoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TEACHER_PHOTO_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `teacher_${req.params.id}_${Date.now()}${ext}`);
  },
});
const teacherPhotoUpload = multer({
  storage: teacherPhotoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPG, PNG, WebP, or GIF images are allowed'));
  },
});

const router = express.Router();

// ─── TEAM MEMBERS ────────────────────────────────────────────────────────────

// GET /api/content/team — superadmin list (all, including inactive)
router.get('/team', requireAuth, requireRole('superadmin'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, title, bio, photo_url, linkedin_url, display_order, is_active,
              photo_source,
              (photo_uploaded_path IS NOT NULL) AS has_uploaded_photo,
              created_at
       FROM team_members ORDER BY display_order ASC, created_at ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/content/team
router.post('/team', requireAuth, requireRole('superadmin'), async (req, res) => {
  const { name, title, bio, photo_url, linkedin_url, display_order, photo_source } = req.body;
  if (!name || !title) return res.status(400).json({ error: 'name and title are required' });
  try {
    const result = await db.query(
      `INSERT INTO team_members (name, title, bio, photo_url, linkedin_url, display_order, photo_source)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, title, bio, photo_url, linkedin_url,
               display_order, is_active, photo_source,
               (photo_uploaded_path IS NOT NULL) AS has_uploaded_photo`,
      [name, title, bio || null, photo_url || null, linkedin_url || null,
       display_order ?? 99, photo_source || 'url']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/content/team/:id
router.put('/team/:id', requireAuth, requireRole('superadmin'), async (req, res) => {
  const { name, title, bio, photo_url, linkedin_url, display_order, is_active, photo_source } = req.body;
  try {
    const result = await db.query(
      `UPDATE team_members
       SET name          = COALESCE($1, name),
           title         = COALESCE($2, title),
           bio           = $3,
           photo_url     = $4,
           linkedin_url  = $5,
           display_order = COALESCE($6, display_order),
           is_active     = COALESCE($7, is_active),
           photo_source  = COALESCE($8, photo_source)
       WHERE id = $9
       RETURNING id, name, title, bio, photo_url, linkedin_url, display_order, is_active,
                 photo_source, (photo_uploaded_path IS NOT NULL) AS has_uploaded_photo`,
      [name, title, bio ?? null, photo_url ?? null, linkedin_url ?? null,
       display_order, is_active, photo_source || null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/content/team/:id/photo — upload a team member photo
router.post(
  '/team/:id/photo',
  requireAuth,
  requireRole('superadmin'),
  (req, res, next) => {
    teamPhotoUpload.single('photo')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Photo must be under 5 MB' : err.message });
      }
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
      // Delete any previously uploaded photo file
      const prev = await db.query('SELECT photo_uploaded_path FROM team_members WHERE id = $1', [req.params.id]);
      const oldPath = prev.rows[0]?.photo_uploaded_path;
      if (oldPath && fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch {}
      }

      const result = await db.query(
        `UPDATE team_members SET photo_uploaded_path = $1 WHERE id = $2
         RETURNING id, (photo_uploaded_path IS NOT NULL) AS has_uploaded_photo`,
        [req.file.path, req.params.id]
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Team member not found' });
      res.json({ ok: true, has_uploaded_photo: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// DELETE /api/content/team/:id
router.delete('/team/:id', requireAuth, requireRole('superadmin'), async (req, res) => {
  try {
    // Clean up uploaded photo file if any
    const row = await db.query('SELECT photo_uploaded_path FROM team_members WHERE id = $1', [req.params.id]);
    const filePath = row.rows[0]?.photo_uploaded_path;
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
    await db.query('DELETE FROM team_members WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── CITIES ──────────────────────────────────────────────────────────────────

// GET /api/content/cities — superadmin list (all)
router.get('/cities', requireAuth, requireRole('superadmin'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ci.*, co.name as country_name, co.code as country_code
       FROM cities ci
       LEFT JOIN countries co ON co.id = ci.country_id
       ORDER BY ci.display_order ASC, ci.name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/content/cities
router.post('/cities', requireAuth, requireRole('superadmin'), async (req, res) => {
  const { name, country_id, description, display_order } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const result = await db.query(
      `INSERT INTO cities (name, country_id, description, display_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, country_id || null, description || null, display_order ?? 99]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/content/cities/:id
router.put('/cities/:id', requireAuth, requireRole('superadmin'), async (req, res) => {
  const { name, country_id, description, display_order, is_active } = req.body;
  try {
    const result = await db.query(
      `UPDATE cities
       SET name = COALESCE($1, name),
           country_id = $2,
           description = $3,
           display_order = COALESCE($4, display_order),
           is_active = COALESCE($5, is_active)
       WHERE id = $6 RETURNING *`,
      [name, country_id ?? null, description ?? null, display_order, is_active, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/content/cities/:id
router.delete('/cities/:id', requireAuth, requireRole('superadmin'), async (req, res) => {
  try {
    await db.query('DELETE FROM cities WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── BOOK SUBMISSIONS ────────────────────────────────────────────────────────

// GET /api/content/books — superadmin sees all; other auth users see own + approved
router.get('/books', requireAuth, async (req, res) => {
  try {
    const isSuperadmin = req.user.role === 'superadmin';
    const where = isSuperadmin ? '' : `WHERE (bs.user_id = $1 OR bs.status = 'approved')`;
    const params = isSuperadmin ? [] : [req.user.id];

    const result = await db.query(
      `SELECT bs.*, u.name as submitter_name
       FROM book_submissions bs
       JOIN users u ON u.id = bs.user_id
       ${where}
       ORDER BY bs.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/content/books — any authenticated user
router.post('/books', requireAuth, async (req, res) => {
  const { amazon_url, title, author, reason } = req.body;
  if (!amazon_url || !title) {
    return res.status(400).json({ error: 'amazon_url and title are required' });
  }
  // Basic Amazon URL validation
  if (!amazon_url.includes('amazon.')) {
    return res.status(400).json({ error: 'Please provide a valid Amazon URL' });
  }
  try {
    const result = await db.query(
      `INSERT INTO book_submissions (user_id, amazon_url, title, author, reason)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, amazon_url, title, author || null, reason || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/content/books/:id/review — superadmin approves or rejects
router.put('/books/:id/review', requireAuth, requireRole('superadmin'), async (req, res) => {
  const { status, admin_notes } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be approved or rejected' });
  }
  try {
    const result = await db.query(
      `UPDATE book_submissions SET status = $1, admin_notes = $2 WHERE id = $3 RETURNING *`,
      [status, admin_notes || null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/content/books/:id — superadmin only
router.delete('/books/:id', requireAuth, requireRole('superadmin'), async (req, res) => {
  try {
    await db.query('DELETE FROM book_submissions WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── TEACHER PROFILES ────────────────────────────────────────────────────────

// Helper: caller may act on teacherId if they are that teacher, or an admin/superadmin
function canEditTeacher(caller, teacherId) {
  if (['admin', 'superadmin'].includes(caller.role)) return true;
  if (caller.role === 'teacher' && caller.id === teacherId) return true;
  return false;
}

// GET /api/content/teachers — admin/superadmin list all teachers with profile fields
router.get('/teachers', requireAuth, requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, bio, linkedin_url, avatar_url,
              show_on_team, is_active,
              (profile_photo_path IS NOT NULL) AS has_uploaded_photo
       FROM users
       WHERE role = 'teacher'
       ORDER BY name ASC`
    );
    // Attach photo URL
    const rows = result.rows.map((t) => ({
      ...t,
      photo_url: t.has_uploaded_photo
        ? `/api/public/teacher/${t.id}/photo`
        : (t.avatar_url || null),
    }));
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/content/teacher/:id — get own profile (teacher) or any (admin/superadmin)
router.get('/teacher/:id', requireAuth, async (req, res) => {
  if (!canEditTeacher(req.user, req.params.id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const result = await db.query(
      `SELECT id, name, email, bio, linkedin_url, avatar_url, show_on_team, is_active,
              (profile_photo_path IS NOT NULL) AS has_uploaded_photo
       FROM users WHERE id = $1 AND role = 'teacher'`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Teacher not found' });
    const t = result.rows[0];
    res.json({
      ...t,
      photo_url: t.has_uploaded_photo
        ? `/api/public/teacher/${t.id}/photo`
        : (t.avatar_url || null),
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/content/teacher/:id — update bio, linkedin_url, show_on_team
router.put('/teacher/:id', requireAuth, async (req, res) => {
  if (!canEditTeacher(req.user, req.params.id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { bio, linkedin_url, show_on_team } = req.body;
  try {
    const result = await db.query(
      `UPDATE users
       SET bio          = $1,
           linkedin_url = $2,
           show_on_team = COALESCE($3, show_on_team)
       WHERE id = $4 AND role = 'teacher'
       RETURNING id, name, bio, linkedin_url, show_on_team,
                 (profile_photo_path IS NOT NULL) AS has_uploaded_photo`,
      [bio ?? null, linkedin_url ?? null, show_on_team ?? null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Teacher not found' });
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/content/teacher/:id/photo — upload profile photo
router.post(
  '/teacher/:id/photo',
  requireAuth,
  (req, res, next) => {
    if (!canEditTeacher(req.user, req.params.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    teacherPhotoUpload.single('photo')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Photo must be under 5 MB' : err.message });
      }
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
      // Delete old photo file if any
      const prev = await db.query('SELECT profile_photo_path FROM users WHERE id = $1', [req.params.id]);
      const oldPath = prev.rows[0]?.profile_photo_path;
      if (oldPath && fs.existsSync(oldPath)) { try { fs.unlinkSync(oldPath); } catch {} }

      await db.query(
        'UPDATE users SET profile_photo_path = $1 WHERE id = $2 AND role = \'teacher\'',
        [req.file.path, req.params.id]
      );
      res.json({ ok: true, photo_url: `/api/public/teacher/${req.params.id}/photo` });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
  }
);

// ─── SITE CONTENT (CMS for public pages) ─────────────────────────────────────

// GET /api/content/site/:section — superadmin: read current content
router.get('/site/:section', requireAuth, requireRole('superadmin'), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT content, updated_at, updated_by FROM site_content WHERE section = $1',
      [req.params.section]
    );
    if (!result.rows[0]) {
      return res.json({ content: {}, updated_at: null, updated_by: null });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/content/site/:section — superadmin: upsert content
router.put('/site/:section', requireAuth, requireRole('superadmin'), async (req, res) => {
  const { content } = req.body;
  if (content === undefined) return res.status(400).json({ error: 'content is required' });
  try {
    const result = await db.query(
      `INSERT INTO site_content (section, content, updated_at, updated_by)
       VALUES ($1, $2::jsonb, NOW(), $3)
       ON CONFLICT (section) DO UPDATE
         SET content    = EXCLUDED.content,
             updated_at = NOW(),
             updated_by = EXCLUDED.updated_by
       RETURNING section, updated_at`,
      [req.params.section, JSON.stringify(content), req.user.id]
    );
    res.json({ ok: true, ...result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
