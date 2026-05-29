const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const { createNotification } = require('../services/notifications');

const router = express.Router();

// GET /api/classes
router.get('/', authenticate, async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const { id: userId, role } = req.user;

  try {
    let query, params, countQuery, countParams;
    if (role === 'student') {
      const enrolledOnly = req.query.enrolledOnly === 'true';
      const enrolledFilter = enrolledOnly ? 'AND en.class_id IS NOT NULL' : '';
      query = `
        SELECT c.*, u.name as admin_name, cp.price, cp.currency,
               (en.class_id IS NOT NULL) as is_enrolled,
               (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id) as enrolled_count
        FROM classes c
        JOIN users u ON u.id = c.admin_id
        LEFT JOIN enrollments en ON en.class_id = c.id AND en.student_id = $1
        LEFT JOIN class_pricing cp ON cp.class_id = c.id AND cp.is_default = TRUE
        WHERE c.is_active = TRUE ${enrolledFilter} ${search ? `AND c.name ILIKE $2` : ''}
        ORDER BY c.created_at DESC LIMIT ${search ? '$3' : '$2'} OFFSET ${search ? '$4' : '$3'}`;
      params = search ? [userId, `%${search}%`, limit, offset] : [userId, limit, offset];
      countQuery = `
        SELECT COUNT(*) FROM classes c
        LEFT JOIN enrollments en ON en.class_id = c.id AND en.student_id = $1
        WHERE c.is_active = TRUE ${enrolledFilter} ${search ? `AND c.name ILIKE $2` : ''}`;
      countParams = search ? [userId, `%${search}%`] : [userId];
    } else if (role === 'teacher') {
      query = `
        SELECT c.*, u.name as admin_name,
               (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id) as enrolled_count
        FROM classes c
        JOIN users u ON u.id = c.admin_id
        JOIN teacher_assignments ta ON ta.class_id = c.id AND ta.teacher_id = $1
        WHERE c.is_active = TRUE ${search ? `AND c.name ILIKE $2` : ''}
        ORDER BY c.created_at DESC LIMIT ${search ? '$3' : '$2'} OFFSET ${search ? '$4' : '$3'}`;
      params = search ? [userId, `%${search}%`, limit, offset] : [userId, limit, offset];
      countQuery = `
        SELECT COUNT(*) FROM classes c
        JOIN teacher_assignments ta ON ta.class_id = c.id AND ta.teacher_id = $1
        WHERE c.is_active = TRUE ${search ? `AND c.name ILIKE $2` : ''}`;
      countParams = search ? [userId, `%${search}%`] : [userId];
    } else if (role === 'admin') {
      query = `
        SELECT c.*, u.name as admin_name,
               (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id) as enrolled_count
        FROM classes c
        JOIN users u ON u.id = c.admin_id
        WHERE c.admin_id = $1 ${search ? `AND c.name ILIKE $2` : ''}
        ORDER BY c.created_at DESC LIMIT ${search ? '$3' : '$2'} OFFSET ${search ? '$4' : '$3'}`;
      params = search ? [userId, `%${search}%`, limit, offset] : [userId, limit, offset];
      countQuery = `SELECT COUNT(*) FROM classes WHERE admin_id = $1 ${search ? `AND name ILIKE $2` : ''}`;
      countParams = search ? [userId, `%${search}%`] : [userId];
    } else {
      // superadmin sees all
      query = `
        SELECT c.*, u.name as admin_name,
               (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id) as enrolled_count
        FROM classes c
        JOIN users u ON u.id = c.admin_id
        ${search ? `WHERE c.name ILIKE $1` : ''}
        ORDER BY c.created_at DESC LIMIT ${search ? '$2' : '$1'} OFFSET ${search ? '$3' : '$2'}`;
      params = search ? [`%${search}%`, limit, offset] : [limit, offset];
      countQuery = `SELECT COUNT(*) FROM classes ${search ? `WHERE name ILIKE $1` : ''}`;
      countParams = search ? [`%${search}%`] : [];
    }

    const [result, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, countParams),
    ]);
    res.json({ classes: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/classes
router.post(
  '/',
  authenticate,
  authorize('admin', 'superadmin'),
  [body('name').trim().notEmpty(), body('subject').optional()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, description, subject, level, maxStudents, enrollmentDeadline, allowLateEnrollment } = req.body;
    try {
      const result = await db.query(
        `INSERT INTO classes (name, description, admin_id, subject, level, max_students, enrollment_deadline, allow_late_enrollment)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [name, description, req.user.id, subject, level, maxStudents || 30, enrollmentDeadline || null, allowLateEnrollment || false]
      );
      res.status(201).json(result.rows[0]);
    } catch {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET /api/classes/:id
router.get('/:id', authenticate, async (req, res) => {
  const result = await db.query(
    `SELECT c.*, u.name as admin_name,
            (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id) as enrolled_count,
            (SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'email', t.email))
             FROM teacher_assignments ta JOIN users t ON t.id = ta.teacher_id
             WHERE ta.class_id = c.id) as teachers
     FROM classes c JOIN users u ON u.id = c.admin_id
     WHERE c.id = $1`,
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Class not found' });

  // Pricing
  const pricing = await db.query(
    `SELECT cp.*, co.name as country_name, co.code as country_code, co.currency_symbol
     FROM class_pricing cp
     LEFT JOIN countries co ON co.id = cp.country_id
     WHERE cp.class_id = $1 ORDER BY cp.is_default DESC`,
    [req.params.id]
  );

  res.json({ ...result.rows[0], pricing: pricing.rows });
});

// PUT /api/classes/:id
router.put('/:id', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  const { name, description, subject, level, maxStudents, isActive, enrollmentDeadline, allowLateEnrollment } = req.body;
  try {
    const result = await db.query(
      `UPDATE classes SET
         name = COALESCE($1, name), description = COALESCE($2, description),
         subject = COALESCE($3, subject), level = COALESCE($4, level),
         max_students = COALESCE($5, max_students), is_active = COALESCE($6, is_active),
         enrollment_deadline = COALESCE($7, enrollment_deadline),
         allow_late_enrollment = COALESCE($8, allow_late_enrollment),
         updated_at = NOW()
       WHERE id = $9 AND ($10 = 'superadmin' OR admin_id = $11)
       RETURNING *`,
      [name, description, subject, level, maxStudents, isActive, enrollmentDeadline, allowLateEnrollment, req.params.id, req.user.role, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Class not found' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/classes/:id
router.delete('/:id', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  await db.query('UPDATE classes SET is_active = FALSE WHERE id = $1', [req.params.id]);
  res.json({ message: 'Class deactivated' });
});

// POST /api/classes/:id/pricing
router.post('/:id/pricing', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  const { countryId, price, isDefault } = req.body;
  try {
    // Look up the country's currency so price is always in local currency
    let currency = 'USD';
    if (countryId) {
      const c = await db.query('SELECT currency_code FROM countries WHERE id = $1', [countryId]);
      if (c.rows[0]) currency = c.rows[0].currency_code;
    }

    // Use raw SQL with ON CONFLICT on the partial unique indexes
    // country_id set → use uniq_class_country_price index
    // country_id null → use uniq_class_default_price index
    let result;
    if (countryId) {
      result = await db.query(
        `INSERT INTO class_pricing (class_id, country_id, price, currency, is_default)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (class_id, country_id) WHERE country_id IS NOT NULL
         DO UPDATE SET price = $3, currency = $4, is_default = $5, updated_at = NOW()
         RETURNING *`,
        [req.params.id, countryId, price, currency, isDefault ?? false]
      );
    } else {
      result = await db.query(
        `INSERT INTO class_pricing (class_id, country_id, price, currency, is_default)
         VALUES ($1, NULL, $2, $3, TRUE)
         ON CONFLICT (class_id) WHERE country_id IS NULL AND region_id IS NULL
         DO UPDATE SET price = $2, currency = $3, is_default = TRUE, updated_at = NOW()
         RETURNING *`,
        [req.params.id, price, currency]
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/classes/:id/assign-teacher
router.post('/:id/assign-teacher', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  const { teacherId } = req.body;
  try {
    // Only one teacher allowed per class
    const existing = await db.query(
      'SELECT teacher_id FROM teacher_assignments WHERE class_id = $1',
      [req.params.id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'A teacher is already assigned. Remove the current teacher first.' });
    }

    await db.query(
      `INSERT INTO teacher_assignments (class_id, teacher_id, assigned_by)
       VALUES ($1, $2, $3)`,
      [req.params.id, teacherId, req.user.id]
    );

    const cls = await db.query('SELECT name FROM classes WHERE id = $1', [req.params.id]);
    await createNotification({
      userId: teacherId,
      title: `You've been assigned to a class`,
      message: `You have been assigned as a teacher for "${cls.rows[0]?.name}".`,
      type: 'class',
      metadata: { classId: req.params.id },
    });

    res.json({ message: 'Teacher assigned' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/classes/:id/remove-teacher/:teacherId
router.delete('/:id/remove-teacher/:teacherId', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  await db.query(
    'DELETE FROM teacher_assignments WHERE class_id = $1 AND teacher_id = $2',
    [req.params.id, req.params.teacherId]
  );
  res.json({ message: 'Teacher removed' });
});

// POST /api/classes/:id/enroll
router.post('/:id/enroll', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  const { studentId, paymentStatus } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO enrollments (class_id, student_id, enrolled_by, payment_status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [req.params.id, studentId, req.user.id, paymentStatus || 'pending']
    );

    const cls = await db.query('SELECT name FROM classes WHERE id = $1', [req.params.id]);
    await createNotification({
      userId: studentId,
      title: `Enrolled in a new class`,
      message: `You have been enrolled in "${cls.rows[0]?.name}".`,
      type: 'class',
      metadata: { classId: req.params.id },
    });

    res.json(result.rows[0] || { message: 'Already enrolled' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/classes/:id/unenroll/:studentId
router.delete('/:id/unenroll/:studentId', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  await db.query('DELETE FROM enrollments WHERE class_id = $1 AND student_id = $2', [req.params.id, req.params.studentId]);
  res.json({ message: 'Student removed' });
});

// GET /api/classes/:id/enrollments
router.get('/:id/enrollments', authenticate, async (req, res) => {
  const result = await db.query(
    `SELECT e.*, u.name, u.email, u.phone FROM enrollments e
     JOIN users u ON u.id = e.student_id
     WHERE e.class_id = $1 ORDER BY e.enrolled_at DESC`,
    [req.params.id]
  );
  res.json(result.rows);
});

module.exports = router;
