const express = require('express');
const db = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/pricing - global pricing tiers
router.get('/', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  const result = await db.query('SELECT * FROM pricing_tiers ORDER BY base_price ASC');
  res.json(result.rows);
});

// POST /api/pricing
router.post('/', authenticate, authorize('superadmin'), async (req, res) => {
  const { name, description, basePrice, currency } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO pricing_tiers (name, description, base_price, currency, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, description, basePrice, currency || 'USD', req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/pricing/:id
router.put('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  const { name, description, basePrice, currency } = req.body;
  const result = await db.query(
    `UPDATE pricing_tiers SET name = COALESCE($1, name), description = COALESCE($2, description),
     base_price = COALESCE($3, base_price), currency = COALESCE($4, currency), updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [name, description, basePrice, currency, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Pricing tier not found' });
  res.json(result.rows[0]);
});

// DELETE /api/pricing/:id
router.delete('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  await db.query('DELETE FROM pricing_tiers WHERE id = $1', [req.params.id]);
  res.json({ message: 'Pricing tier deleted' });
});

module.exports = router;
