const express = require('express');
const db = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const mathwave = require('../services/mathwave');

const router = express.Router();

// GET /api/mathwave/status
router.get('/status', authenticate, async (req, res) => {
  const configured = !!(process.env.MATHWAVE_API_URL && process.env.MATHWAVE_API_KEY);
  res.json({ configured, message: configured ? 'Mathwave integration active' : 'Mathwave integration pending configuration' });
});

// POST /api/mathwave/sync/:classId
router.post('/sync/:classId', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  const cls = await db.query('SELECT * FROM classes WHERE id = $1', [req.params.classId]);
  if (!cls.rows[0]) return res.status(404).json({ error: 'Class not found' });

  const result = await mathwave.syncClass(req.params.classId, cls.rows[0].name);
  res.json(result);
});

// GET /api/mathwave/results/:studentId
router.get('/results/:studentId', authenticate, async (req, res) => {
  const { classId } = req.query;
  const result = await mathwave.getStudentResults(req.params.studentId, classId);
  res.json(result);
});

// GET /api/mathwave/assignments/:classId
router.get('/assignments/:classId', authenticate, async (req, res) => {
  const result = await db.query(
    'SELECT * FROM mathwave_assignments WHERE class_id = $1 ORDER BY created_at DESC',
    [req.params.classId]
  );
  res.json(result.rows);
});

module.exports = router;
