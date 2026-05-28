const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const zoomService = require('../services/zoom');
const { notifyScheduleCreated, notifyZoomCreated } = require('../services/notifications');

const router = express.Router();

// GET /api/schedules
router.get('/', authenticate, async (req, res) => {
  const { classId, from, to } = req.query;
  const { id: userId, role } = req.user;

  try {
    let where = ['1=1'];
    let params = [];
    let idx = 1;

    if (classId) {
      where.push(`cs.class_id = $${idx++}`);
      params.push(classId);
    }
    if (from) {
      where.push(`cs.start_time >= $${idx++}`);
      params.push(from);
    }
    if (to) {
      where.push(`cs.start_time <= $${idx++}`);
      params.push(to);
    }

    // Scope by role
    if (role === 'student') {
      where.push(`EXISTS (SELECT 1 FROM enrollments e WHERE e.class_id = cs.class_id AND e.student_id = $${idx++})`);
      params.push(userId);
    } else if (role === 'teacher') {
      where.push(`EXISTS (SELECT 1 FROM teacher_assignments ta WHERE ta.class_id = cs.class_id AND ta.teacher_id = $${idx++})`);
      params.push(userId);
    } else if (role === 'admin') {
      where.push(`EXISTS (SELECT 1 FROM classes c WHERE c.id = cs.class_id AND c.admin_id = $${idx++})`);
      params.push(userId);
    }

    const result = await db.query(
      `SELECT cs.*, c.name as class_name, c.subject
       FROM class_schedules cs
       JOIN classes c ON c.id = cs.class_id
       WHERE ${where.join(' AND ')}
       ORDER BY cs.start_time ASC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/schedules
router.post(
  '/',
  authenticate,
  authorize('admin', 'superadmin'),
  [
    body('classId').notEmpty(),
    body('startTime').isISO8601(),
    body('endTime').isISO8601(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { classId, title, startTime, endTime, recurringType, dayOfWeek, notes } = req.body;
    try {
      const result = await db.query(
        `INSERT INTO class_schedules (class_id, title, start_time, end_time, recurring_type, day_of_week, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [classId, title, startTime, endTime, recurringType || 'once', dayOfWeek, notes]
      );

      const schedule = result.rows[0];
      await notifyScheduleCreated(schedule.id, classId);

      res.status(201).json(schedule);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET /api/schedules/:id
router.get('/:id', authenticate, async (req, res) => {
  const result = await db.query(
    `SELECT cs.*, c.name as class_name FROM class_schedules cs
     JOIN classes c ON c.id = cs.class_id
     WHERE cs.id = $1`,
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Schedule not found' });
  res.json(result.rows[0]);
});

// PUT /api/schedules/:id
router.put('/:id', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  const { title, startTime, endTime, recurringType, notes } = req.body;
  try {
    const result = await db.query(
      `UPDATE class_schedules SET
         title = COALESCE($1, title),
         start_time = COALESCE($2, start_time),
         end_time = COALESCE($3, end_time),
         recurring_type = COALESCE($4, recurring_type),
         notes = COALESCE($5, notes),
         updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [title, startTime, endTime, recurringType, notes, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Schedule not found' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/schedules/:id
router.delete('/:id', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  const schedule = await db.query('SELECT zoom_meeting_id FROM class_schedules WHERE id = $1', [req.params.id]);
  if (schedule.rows[0]?.zoom_meeting_id) {
    await zoomService.deleteMeeting(schedule.rows[0].zoom_meeting_id).catch(() => {});
  }
  await db.query('DELETE FROM class_schedules WHERE id = $1', [req.params.id]);
  res.json({ message: 'Schedule deleted' });
});

// POST /api/schedules/:id/zoom - create zoom meeting for a schedule
router.post('/:id/zoom', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  const schedule = await db.query(
    `SELECT cs.*, c.name as class_name FROM class_schedules cs
     JOIN classes c ON c.id = cs.class_id WHERE cs.id = $1`,
    [req.params.id]
  );
  if (!schedule.rows[0]) return res.status(404).json({ error: 'Schedule not found' });

  const s = schedule.rows[0];
  try {
    const durationMinutes = Math.round((new Date(s.end_time) - new Date(s.start_time)) / 60000);
    const meeting = await zoomService.createMeeting({
      topic: s.title || s.class_name,
      startTime: s.start_time,
      duration: durationMinutes,
    });

    await db.query(
      `UPDATE class_schedules SET
         zoom_meeting_id = $1, zoom_join_url = $2, zoom_start_url = $3, zoom_password = $4,
         updated_at = NOW()
       WHERE id = $5`,
      [meeting.meetingId, meeting.joinUrl, meeting.startUrl, meeting.password, req.params.id]
    );

    await notifyZoomCreated(req.params.id, s.class_id, meeting.joinUrl);

    res.json(meeting);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create Zoom meeting' });
  }
});

module.exports = router;
