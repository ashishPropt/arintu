const express = require('express');
const db = require('../database/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications
router.get('/', authenticate, async (req, res) => {
  const { unreadOnly, limit = 20, page = 1 } = req.query;
  const offset = (page - 1) * limit;
  const where = unreadOnly === 'true' ? 'AND is_read = FALSE' : '';

  const result = await db.query(
    `SELECT * FROM notifications WHERE user_id = $1 ${where}
     ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [req.user.id, limit, offset]
  );
  const count = await db.query(
    'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
    [req.user.id]
  );
  res.json({ notifications: result.rows, unreadCount: parseInt(count.rows[0].count) });
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticate, async (req, res) => {
  await db.query(
    'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  res.json({ message: 'Marked as read' });
});

// PUT /api/notifications/read-all
router.put('/read-all', authenticate, async (req, res) => {
  await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.id]);
  res.json({ message: 'All marked as read' });
});

module.exports = router;
