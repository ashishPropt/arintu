const express = require('express');
const db = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/waivers/me  — student checks own waiver status
router.get('/me', authenticate, authorize('student'), async (req, res) => {
  try {
    const r = await db.query(
      `SELECT fee_waiver_status, fee_waiver_reason, fee_waiver_notes,
              fee_waiver_requested_at, fee_waiver_reviewed_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    res.json(r.rows[0] || {});
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/waivers  — student requests a fee waiver
router.post('/', authenticate, authorize('student'), async (req, res) => {
  const { reason } = req.body;
  try {
    const existing = await db.query(
      'SELECT fee_waiver_status FROM users WHERE id = $1',
      [req.user.id]
    );
    const current = existing.rows[0]?.fee_waiver_status;
    if (current === 'pending') {
      return res.status(400).json({ error: 'You already have a pending waiver request.' });
    }
    if (current === 'approved') {
      return res.status(400).json({ error: 'Your fee waiver is already approved.' });
    }

    await db.query(
      `UPDATE users SET
         fee_waiver_status        = 'pending',
         fee_waiver_reason        = $2,
         fee_waiver_notes         = NULL,
         fee_waiver_reviewed_by   = NULL,
         fee_waiver_reviewed_at   = NULL,
         fee_waiver_requested_at  = NOW()
       WHERE id = $1`,
      [req.user.id, reason || null]
    );

    // Notify all super admins
    const superAdmins = await db.query(
      "SELECT id FROM users WHERE role = 'superadmin' AND is_active = true"
    );
    const student = await db.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    for (const sa of superAdmins.rows) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, 'Fee Waiver Request', $2, 'info')`,
        [sa.id, `${student.rows[0].name} has requested an application fee waiver.`]
      );
    }

    res.json({ message: 'Waiver request submitted. You will be notified once reviewed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/waivers  — super admin: list all waiver requests
router.get('/', authenticate, authorize('superadmin'), async (req, res) => {
  const { status } = req.query;
  const params = [];
  let statusClause = '';
  if (status) {
    params.push(status);
    statusClause = `AND u.fee_waiver_status = $${params.length}`;
  }
  try {
    const r = await db.query(
      `SELECT u.id, u.name, u.email,
              u.fee_waiver_status, u.fee_waiver_reason, u.fee_waiver_notes,
              u.fee_waiver_requested_at, u.fee_waiver_reviewed_at,
              rev.name AS reviewed_by_name
       FROM users u
       LEFT JOIN users rev ON rev.id = u.fee_waiver_reviewed_by
       WHERE u.role = 'student'
         AND u.fee_waiver_status IS NOT NULL
         ${statusClause}
       ORDER BY
         CASE u.fee_waiver_status WHEN 'pending' THEN 0 ELSE 1 END,
         u.fee_waiver_requested_at DESC`,
      params
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/waivers/:userId/review  — super admin approves or rejects
router.put('/:userId/review', authenticate, authorize('superadmin'), async (req, res) => {
  const { action, notes } = req.body;
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Action must be approve or reject' });
  }
  const status = action === 'approve' ? 'approved' : 'rejected';
  try {
    const r = await db.query(
      `UPDATE users SET
         fee_waiver_status       = $2,
         fee_waiver_notes        = $3,
         fee_waiver_reviewed_by  = $4,
         fee_waiver_reviewed_at  = NOW()
       WHERE id = $1 AND role = 'student'
       RETURNING id, name`,
      [req.params.userId, status, notes || null, req.user.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Student not found' });

    const msg = action === 'approve'
      ? 'Great news! Your application fee waiver has been approved. You can now apply to classes without paying the application fee.'
      : `Your application fee waiver request was not approved.${notes ? ' Reason: ' + notes : ''} You may still apply by paying the standard application fee.`;

    await db.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, 'info')`,
      [
        req.params.userId,
        action === 'approve' ? 'Fee Waiver Approved ✅' : 'Fee Waiver Not Approved',
        msg,
      ]
    );

    res.json({ message: `Waiver ${status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
