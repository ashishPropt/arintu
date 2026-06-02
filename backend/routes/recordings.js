/**
 * Recordings routes
 *
 * GET /api/recordings              — list all recordings (all authenticated roles)
 * GET /api/recordings/class/:id    — recordings for a specific class
 */
const express = require('express');
const db      = require('../database/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/recordings ───────────────────────────────────────────────────────
// Returns all recordings the caller is allowed to see.
// Superadmin/admin: all recordings.
// Teacher: only classes they teach.
// Student: only classes they're enrolled in.
// Parent: classes their children are enrolled in.
router.get('/', authenticate, async (req, res) => {
  try {
    let query;
    let params;
    const { role, id: userId } = req.user;

    if (role === 'superadmin' || role === 'admin') {
      query = `
        SELECT cr.*, c.name AS class_name, c.subject
        FROM class_recordings cr
        JOIN classes c ON c.id = cr.class_id
        ORDER BY cr.recorded_at DESC`;
      params = [];
    } else if (role === 'teacher') {
      query = `
        SELECT cr.*, c.name AS class_name, c.subject
        FROM class_recordings cr
        JOIN classes c ON c.id = cr.class_id
        JOIN class_teachers ct ON ct.class_id = c.id AND ct.teacher_id = $1
        ORDER BY cr.recorded_at DESC`;
      params = [userId];
    } else if (role === 'student') {
      query = `
        SELECT cr.*, c.name AS class_name, c.subject
        FROM class_recordings cr
        JOIN classes c ON c.id = cr.class_id
        JOIN enrollments e ON e.class_id = c.id AND e.student_id = $1
        ORDER BY cr.recorded_at DESC`;
      params = [userId];
    } else if (role === 'parent') {
      query = `
        SELECT cr.*, c.name AS class_name, c.subject
        FROM class_recordings cr
        JOIN classes c ON c.id = cr.class_id
        JOIN enrollments e ON e.class_id = c.id
        JOIN users child ON child.id = e.student_id AND child.parent_id = $1
        ORDER BY cr.recorded_at DESC`;
      params = [userId];
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/recordings/class/:classId ───────────────────────────────────────
router.get('/class/:classId', authenticate, async (req, res) => {
  const { classId } = req.params;
  const { role, id: userId } = req.user;

  try {
    // Access check: verify the caller is allowed to see this class's recordings
    if (role === 'student') {
      const check = await db.query(
        'SELECT 1 FROM enrollments WHERE class_id = $1 AND student_id = $2',
        [classId, userId]
      );
      if (!check.rows[0]) return res.status(403).json({ error: 'Not enrolled in this class' });
    } else if (role === 'parent') {
      const check = await db.query(
        `SELECT 1 FROM enrollments e
         JOIN users child ON child.id = e.student_id AND child.parent_id = $2
         WHERE e.class_id = $1`,
        [classId, userId]
      );
      if (!check.rows[0]) return res.status(403).json({ error: 'No child enrolled in this class' });
    } else if (role === 'teacher') {
      const check = await db.query(
        'SELECT 1 FROM class_teachers WHERE class_id = $1 AND teacher_id = $2',
        [classId, userId]
      );
      if (!check.rows[0]) return res.status(403).json({ error: 'Not teaching this class' });
    }
    // superadmin/admin: no restriction

    const result = await db.query(
      `SELECT cr.*, c.name AS class_name, c.subject
       FROM class_recordings cr
       JOIN classes c ON c.id = cr.class_id
       WHERE cr.class_id = $1
       ORDER BY cr.recorded_at DESC`,
      [classId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
