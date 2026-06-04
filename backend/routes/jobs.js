/**
 * Jobs routes — superadmin manages job postings.
 *
 * GET    /api/jobs         — list all jobs (superadmin)
 * POST   /api/jobs         — create a job (superadmin)
 * PUT    /api/jobs/:id     — update a job (superadmin)
 * DELETE /api/jobs/:id     — delete a job (superadmin)
 */
const express = require('express');
const db      = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require superadmin
router.use(authenticate, authorize('superadmin'));

// GET /api/jobs
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM jobs ORDER BY display_order ASC, created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/jobs
router.post('/', async (req, res) => {
  const { title, department, location, type, description, requirements, is_active, display_order } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  try {
    const result = await db.query(
      `INSERT INTO jobs (title, department, location, type, description, requirements, is_active, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title.trim(), department || null, location || null, type || 'Full-time',
       description || null, requirements || null,
       is_active !== false, display_order || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/jobs/:id
router.put('/:id', async (req, res) => {
  const { title, department, location, type, description, requirements, is_active, display_order } = req.body;
  try {
    const result = await db.query(
      `UPDATE jobs SET
         title         = COALESCE($1, title),
         department    = $2,
         location      = $3,
         type          = COALESCE($4, type),
         description   = $5,
         requirements  = $6,
         is_active     = COALESCE($7, is_active),
         display_order = COALESCE($8, display_order),
         updated_at    = NOW()
       WHERE id = $9 RETURNING *`,
      [title?.trim() || null, department || null, location || null,
       type || null, description || null, requirements || null,
       is_active !== undefined ? is_active : null,
       display_order !== undefined ? display_order : null,
       req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Job not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/jobs/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM jobs WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Job not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
