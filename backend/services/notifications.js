const db = require('../database/db');

async function createNotification({ userId, title, message, type = 'info', metadata = null }) {
  await db.query(
    'INSERT INTO notifications (user_id, title, message, type, metadata) VALUES ($1, $2, $3, $4, $5)',
    [userId, title, message, type, metadata ? JSON.stringify(metadata) : null]
  );
}

async function notifyClassMembers({ classId, title, message, type = 'class', metadata = null }) {
  // Notify all enrolled students
  const students = await db.query(
    'SELECT student_id FROM enrollments WHERE class_id = $1',
    [classId]
  );
  // Notify all assigned teachers
  const teachers = await db.query(
    'SELECT teacher_id FROM teacher_assignments WHERE class_id = $1',
    [classId]
  );

  const userIds = [
    ...students.rows.map((r) => r.student_id),
    ...teachers.rows.map((r) => r.teacher_id),
  ];

  for (const userId of userIds) {
    await createNotification({ userId, title, message, type, metadata });
  }
}

async function notifyScheduleCreated(scheduleId, classId) {
  const schedule = await db.query(
    'SELECT cs.*, c.name as class_name FROM class_schedules cs JOIN classes c ON c.id = cs.class_id WHERE cs.id = $1',
    [scheduleId]
  );
  if (!schedule.rows[0]) return;

  const s = schedule.rows[0];
  const startDate = new Date(s.start_time).toLocaleString();
  await notifyClassMembers({
    classId,
    title: `New class scheduled: ${s.class_name}`,
    message: `A session has been scheduled for ${startDate}${s.zoom_join_url ? '. Zoom link available.' : '.'}`,
    type: 'schedule',
    metadata: { scheduleId, classId },
  });
}

async function notifyZoomCreated(scheduleId, classId, joinUrl) {
  const cls = await db.query('SELECT name FROM classes WHERE id = $1', [classId]);
  if (!cls.rows[0]) return;

  await notifyClassMembers({
    classId,
    title: `Zoom meeting ready: ${cls.rows[0].name}`,
    message: `A Zoom meeting has been set up for your class. Join here: ${joinUrl}`,
    type: 'zoom',
    metadata: { scheduleId, classId, joinUrl },
  });
}

module.exports = { createNotification, notifyClassMembers, notifyScheduleCreated, notifyZoomCreated };
