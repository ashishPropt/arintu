const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const zoomService = require('../services/zoom');
const { notifyClassMembers, notifyZoomCreated } = require('../services/notifications');

const router = express.Router();

/**
 * Generate all occurrences of a recurring session.
 * Returns an array of { start: Date, end: Date }.
 * Max 365 entries as a safety cap.
 */
function generateOccurrences(startTime, endTime, recurringType, repeatUntil) {
  const start    = new Date(startTime);
  const end      = new Date(endTime);
  const duration = end - start; // milliseconds
  const until    = repeatUntil ? new Date(repeatUntil) : null;

  // Advance by one interval
  function nextDate(d) {
    const n = new Date(d);
    switch (recurringType) {
      case 'daily':    n.setDate(n.getDate() + 1);       break;
      case 'weekly':   n.setDate(n.getDate() + 7);       break;
      case 'biweekly': n.setDate(n.getDate() + 14);      break;
      case 'monthly':  n.setMonth(n.getMonth() + 1);     break;
      default: return null; // 'once' — stop after first
    }
    return n;
  }

  const results = [{ start, end }];
  if (!until || recurringType === 'once') return results;

  let cursor = nextDate(start);
  while (cursor && cursor <= until && results.length < 365) {
    results.push({ start: new Date(cursor), end: new Date(cursor.getTime() + duration) });
    cursor = nextDate(cursor);
  }
  return results;
}

// GET /api/schedules
router.get('/', authenticate, async (req, res) => {
  const { classId, from, to } = req.query;
  const { id: userId, role } = req.user;

  try {
    let where = ['1=1'];
    let params = [];
    let idx = 1;

    if (classId) { where.push(`cs.class_id = $${idx++}`); params.push(classId); }
    if (from)    { where.push(`cs.start_time >= $${idx++}`); params.push(from); }
    if (to)      { where.push(`cs.start_time <= $${idx++}`); params.push(to); }

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
// Accepts repeatUntil to create multiple occurrences based on recurringType.
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

    const { classId, title, startTime, endTime, recurringType, repeatUntil, notes } = req.body;

    // Validate repeatUntil is after startTime when provided
    if (repeatUntil && new Date(repeatUntil) <= new Date(startTime)) {
      return res.status(400).json({ error: '"Repeat until" date must be after the session start date.' });
    }

    try {
      const occurrences = generateOccurrences(startTime, endTime, recurringType || 'once', repeatUntil);

      const client = await db.pool.connect();
      const created = [];

      try {
        await client.query('BEGIN');

        for (const occ of occurrences) {
          const r = await client.query(
            `INSERT INTO class_schedules
               (class_id, title, start_time, end_time, recurring_type, notes)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [classId, title || null, occ.start.toISOString(), occ.end.toISOString(), recurringType || 'once', notes || null]
          );
          created.push(r.rows[0]);
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      // One notification for the whole series
      const cls = await db.query('SELECT name FROM classes WHERE id = $1', [classId]);
      const className = cls.rows[0]?.name || 'your class';
      const firstDate = new Date(startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      const isRecurring = created.length > 1;
      const notifTitle   = isRecurring
        ? `${created.length} sessions scheduled: ${className}`
        : `New session scheduled: ${className}`;
      const notifMessage = isRecurring
        ? `${created.length} ${recurringType} sessions have been scheduled starting ${firstDate}.`
        : `A session has been scheduled for ${firstDate}.`;

      await notifyClassMembers({ classId, title: notifTitle, message: notifMessage, type: 'schedule' });

      res.status(201).json({ created, count: created.length });
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
     JOIN classes c ON c.id = cs.class_id WHERE cs.id = $1`,
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

// POST /api/schedules/:id/zoom
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
