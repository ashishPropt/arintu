/**
 * Discount campaign endpoints.
 *
 *   GET  /api/discount               — public; current discount status
 *   PUT  /api/discount/extend        — superadmin; extend end time
 *
 * Storage uses 3 keys in global_settings:
 *   discount_pct        — integer percent (e.g. '30')
 *   discount_starts_at  — ISO UTC timestamp
 *   discount_ends_at    — ISO UTC timestamp
 */
const express = require('express');
const db = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

async function readSettings() {
  const r = await db.query(
    "SELECT key, value FROM global_settings WHERE key LIKE 'discount_%'"
  );
  const map = {};
  for (const row of r.rows) map[row.key] = row.value;
  const pct       = parseFloat(map.discount_pct || 0);
  const startsAt  = map.discount_starts_at ? new Date(map.discount_starts_at) : null;
  const endsAt    = map.discount_ends_at   ? new Date(map.discount_ends_at)   : null;
  const now       = new Date();
  const status =
    !startsAt || !endsAt || pct <= 0 ? 'inactive' :
    now < startsAt ? 'upcoming' :
    now >= startsAt && now < endsAt ? 'active' : 'expired';
  return {
    pct,
    starts_at: startsAt ? startsAt.toISOString() : null,
    ends_at:   endsAt   ? endsAt.toISOString()   : null,
    status,
    active:   status === 'active',
    upcoming: status === 'upcoming',
    server_now: now.toISOString(),
  };
}

// GET /api/discount (public — no auth)
router.get('/', async (_req, res) => {
  try {
    res.json(await readSettings());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/discount/extend (superadmin)
// Body: { new_ends_at: '2026-06-20T13:00:00Z' }
router.put('/extend', authenticate, authorize('superadmin'), async (req, res) => {
  const { new_ends_at } = req.body || {};
  if (!new_ends_at) return res.status(400).json({ error: 'new_ends_at is required' });

  const newEnd = new Date(new_ends_at);
  if (isNaN(newEnd.getTime())) return res.status(400).json({ error: 'invalid timestamp' });

  try {
    const current = await readSettings();
    const now = new Date();

    if (current.status === 'expired') {
      return res.status(400).json({ error: 'The discount has already ended; extension is no longer allowed.' });
    }
    if (current.status === 'inactive') {
      return res.status(400).json({ error: 'No discount is configured.' });
    }
    if (current.ends_at && now >= new Date(current.ends_at)) {
      return res.status(400).json({ error: 'The discount has just ended; extension is no longer allowed.' });
    }
    if (current.ends_at && newEnd <= new Date(current.ends_at)) {
      return res.status(400).json({ error: 'New end time must be later than the current end time.' });
    }

    await db.query(
      `INSERT INTO global_settings (key, value, updated_at)
       VALUES ('discount_ends_at', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [newEnd.toISOString()]
    );

    res.json(await readSettings());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = { router, readSettings };
