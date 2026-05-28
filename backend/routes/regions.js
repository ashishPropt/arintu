const express = require('express');
const db = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const result = await db.query('SELECT * FROM regions ORDER BY name');
  res.json(result.rows);
});

router.post('/', authenticate, authorize('superadmin'), async (req, res) => {
  const { name, code } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO regions (name, code) VALUES ($1, $2) RETURNING *',
      [name, code.toUpperCase()]
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(409).json({ error: 'Region code already exists' });
  }
});

router.delete('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  await db.query('DELETE FROM regions WHERE id = $1', [req.params.id]);
  res.json({ message: 'Region deleted' });
});

module.exports = router;
