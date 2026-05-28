/**
 * Content management routes — team, cities, book submissions.
 * CRUD is superadmin-only; book submissions are open to any authenticated user.
 */
const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const requireAuth = authenticate;
const requireRole = (...roles) => authorize(...roles);
const db = require('../database/db');

const router = express.Router();

// ─── TEAM MEMBERS ────────────────────────────────────────────────────────────

// GET /api/content/team — superadmin list (all, including inactive)
router.get('/team', requireAuth, requireRole('superadmin'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM team_members ORDER BY display_order ASC, created_at ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/content/team
router.post('/team', requireAuth, requireRole('superadmin'), async (req, res) => {
  const { name, title, bio, photo_url, linkedin_url, display_order } = req.body;
  if (!name || !title) return res.status(400).json({ error: 'name and title are required' });
  try {
    const result = await db.query(
      `INSERT INTO team_members (name, title, bio, photo_url, linkedin_url, display_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, title, bio || null, photo_url || null, linkedin_url || null, display_order ?? 99]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/content/team/:id
router.put('/team/:id', requireAuth, requireRole('superadmin'), async (req, res) => {
  const { name, title, bio, photo_url, linkedin_url, display_order, is_active } = req.body;
  try {
    const result = await db.query(
      `UPDATE team_members
       SET name = COALESCE($1, name),
           title = COALESCE($2, title),
           bio = $3,
           photo_url = $4,
           linkedin_url = $5,
           display_order = COALESCE($6, display_order),
           is_active = COALESCE($7, is_active)
       WHERE id = $8 RETURNING *`,
      [name, title, bio ?? null, photo_url ?? null, linkedin_url ?? null,
       display_order, is_active, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/content/team/:id
router.delete('/team/:id', requireAuth, requireRole('superadmin'), async (req, res) => {
  try {
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

module.exports = router;
