const express = require('express');
const db = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const { createNotification, notifyClassMembers } = require('../services/notifications');

const router = express.Router();

// POST /api/applications  — student submits an application
router.post('/', authenticate, authorize('student'), async (req, res) => {
  const { classId, countryCode } = req.body;
  const studentId = req.user.id;

  try {
    // Check class exists and is active
    const cls = await db.query('SELECT * FROM classes WHERE id = $1 AND is_active = TRUE', [classId]);
    if (!cls.rows[0]) return res.status(404).json({ error: 'Class not found' });

    // Check not already applied or enrolled
    const existing = await db.query(
      'SELECT id, status FROM class_applications WHERE class_id = $1 AND student_id = $2',
      [classId, studentId]
    );
    if (existing.rows[0]) {
      return res.status(409).json({ error: 'You have already applied to this class.', existing: existing.rows[0] });
    }
    const enrolled = await db.query(
      'SELECT id FROM enrollments WHERE class_id = $1 AND student_id = $2',
      [classId, studentId]
    );
    if (enrolled.rows[0]) {
      return res.status(409).json({ error: 'You are already enrolled in this class.' });
    }

    // Determine if application fee applies
    // Fee waived if student already has at least one approved application elsewhere
    const prevApproved = await db.query(
      `SELECT COUNT(*) FROM class_applications
       WHERE student_id = $1 AND status = 'approved' AND class_id != $2`,
      [studentId, classId]
    );
    const alreadyEnrolledElsewhere = await db.query(
      'SELECT COUNT(*) FROM enrollments WHERE student_id = $1',
      [studentId]
    );
    const feeWaived =
      parseInt(prevApproved.rows[0].count) > 0 ||
      parseInt(alreadyEnrolledElsewhere.rows[0].count) > 0;

    // Get fee for country
    let feeAmount = null;
    let currencyCode = 'USD';
    let countryId = null;

    if (countryCode) {
      const country = await db.query(
        `SELECT c.id, c.currency_code, af.fee
         FROM countries c
         LEFT JOIN application_fees af ON af.country_id = c.id
         WHERE c.code = $1`,
        [countryCode.toUpperCase()]
      );
      if (country.rows[0]) {
        countryId = country.rows[0].id;
        currencyCode = country.rows[0].currency_code;
        feeAmount = feeWaived ? null : (country.rows[0].fee ?? 15);
      }
    } else {
      const usd = await db.query(
        `SELECT af.fee FROM application_fees af JOIN countries c ON c.id = af.country_id WHERE c.code = 'US'`
      );
      feeAmount = feeWaived ? null : (usd.rows[0]?.fee ?? 15);
    }

    // Insert application
    const result = await db.query(
      `INSERT INTO class_applications
         (class_id, student_id, country_id, application_fee_charged, currency_code, fee_waived)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [classId, studentId, countryId, feeWaived ? 0 : feeAmount, currencyCode, feeWaived]
    );

    // Notify admin(s) who own the class
    const admin = await db.query('SELECT admin_id FROM classes WHERE id = $1', [classId]);
    const student = await db.query('SELECT name FROM users WHERE id = $1', [studentId]);

    if (admin.rows[0]) {
      await createNotification({
        userId: admin.rows[0].admin_id,
        title: `New application: ${cls.rows[0].name}`,
        message: `${student.rows[0]?.name} has applied to join "${cls.rows[0].name}".`,
        type: 'class',
        metadata: { applicationId: result.rows[0].id, classId },
      });
    }

    res.status(201).json({
      ...result.rows[0],
      feeWaived,
      feeAmount: feeWaived ? 0 : feeAmount,
      currencyCode,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/applications  — admin/superadmin sees all; student sees own
router.get('/', authenticate, async (req, res) => {
  const { status, classId } = req.query;
  const { id: userId, role } = req.user;

  let where = ['1=1'];
  let params = [];
  let idx = 1;

  if (role === 'student') {
    where.push(`ca.student_id = $${idx++}`);
    params.push(userId);
  } else if (role === 'admin') {
    where.push(`EXISTS (SELECT 1 FROM classes c WHERE c.id = ca.class_id AND c.admin_id = $${idx++})`);
    params.push(userId);
  }

  if (status) { where.push(`ca.status = $${idx++}`); params.push(status); }
  if (classId) { where.push(`ca.class_id = $${idx++}`); params.push(classId); }

  try {
    const result = await db.query(
      `SELECT ca.*,
              u.name as student_name, u.email as student_email,
              cl.name as class_name,
              co.name as country_name, co.currency_symbol
       FROM class_applications ca
       JOIN users u ON u.id = ca.student_id
       JOIN classes cl ON cl.id = ca.class_id
       LEFT JOIN countries co ON co.id = ca.country_id
       WHERE ${where.join(' AND ')}
       ORDER BY ca.applied_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/applications/:id/approve
router.put('/:id/approve', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const app = await client.query(
      `UPDATE class_applications
       SET status = 'approved', reviewed_at = NOW(), reviewed_by = $1
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [req.user.id, req.params.id]
    );
    if (!app.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Application not found or already processed' });
    }

    const { class_id, student_id } = app.rows[0];

    // Enroll the student
    await client.query(
      `INSERT INTO enrollments (class_id, student_id, enrolled_by, payment_status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT DO NOTHING`,
      [class_id, student_id, req.user.id]
    );

    await client.query('COMMIT');

    // Notify student
    const cls = await db.query('SELECT name FROM classes WHERE id = $1', [class_id]);
    await createNotification({
      userId: student_id,
      title: 'Application approved!',
      message: `Your application for "${cls.rows[0]?.name}" has been approved. You are now enrolled.`,
      type: 'class',
      metadata: { classId: class_id },
    });

    res.json(app.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// PUT /api/applications/:id/reject
router.put('/:id/reject', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  const { notes } = req.body;
  const result = await db.query(
    `UPDATE class_applications
     SET status = 'rejected', reviewed_at = NOW(), reviewed_by = $1, notes = $2
     WHERE id = $3 AND status = 'pending'
     RETURNING *`,
    [req.user.id, notes || null, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Application not found or already processed' });

  const { class_id, student_id } = result.rows[0];
  const cls = await db.query('SELECT name FROM classes WHERE id = $1', [class_id]);
  await createNotification({
    userId: student_id,
    title: 'Application update',
    message: `Your application for "${cls.rows[0]?.name}" was not approved at this time.${notes ? ' Note: ' + notes : ''}`,
    type: 'class',
  });

  res.json(result.rows[0]);
});

module.exports = router;
