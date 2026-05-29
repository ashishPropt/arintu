const express = require('express');
const db = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/countries  — public (landing page needs it)
router.get('/', async (req, res) => {
  const result = await db.query('SELECT * FROM countries ORDER BY name');
  res.json(result.rows);
});

// POST /api/countries  — superadmin
router.post('/', authenticate, authorize('superadmin'), async (req, res) => {
  const { name, code, currencyCode, currencySymbol, currencyName } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(
      `INSERT INTO countries (name, code, currency_code, currency_symbol, currency_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, code.toUpperCase(), currencyCode.toUpperCase(), currencySymbol, currencyName || null]
    );
    // Auto-create a default application fee of 15 for the new country
    await client.query(
      'INSERT INTO application_fees (country_id, fee, updated_by) VALUES ($1, 15.00, $2)',
      [r.rows[0].id, req.user.id]
    );
    await client.query('COMMIT');
    res.status(201).json(r.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Country code already exists' });
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// PUT /api/countries/:id  — superadmin
router.put('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  const { name, code, currencyCode, currencySymbol, currencyName } = req.body;
  try {
    const result = await db.query(
      `UPDATE countries SET
         name            = COALESCE($1, name),
         code            = COALESCE($2, code),
         currency_code   = COALESCE($3, currency_code),
         currency_symbol = COALESCE($4, currency_symbol),
         currency_name   = COALESCE($5, currency_name),
         updated_at      = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        name || null,
        code ? code.toUpperCase() : null,
        currencyCode ? currencyCode.toUpperCase() : null,
        currencySymbol || null,
        currencyName || null,
        req.params.id,
      ]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Country not found' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Country code already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/countries/:id  — superadmin
router.delete('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  await db.query('DELETE FROM countries WHERE id = $1', [req.params.id]);
  res.json({ message: 'Country removed' });
});

// GET /api/countries/fees  — superadmin/admin
router.get('/fees', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  const result = await db.query(
    `SELECT af.*, c.name as country_name, c.code as country_code,
            c.currency_code, c.currency_symbol
     FROM application_fees af
     JOIN countries c ON c.id = af.country_id
     ORDER BY c.name`
  );
  res.json(result.rows);
});

// PUT /api/countries/fees/:countryId  — superadmin
router.put('/fees/:countryId', authenticate, authorize('superadmin'), async (req, res) => {
  const { fee } = req.body;
  const result = await db.query(
    `INSERT INTO application_fees (country_id, fee, updated_by, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (country_id) DO UPDATE SET fee = $2, updated_by = $3, updated_at = NOW()
     RETURNING *`,
    [req.params.countryId, fee, req.user.id]
  );
  res.json(result.rows[0]);
});

module.exports = router;
