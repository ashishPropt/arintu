const express = require('express');
const db = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const { createNotification, notifyClassMembers } = require('../services/notifications');

const router = express.Router();

// ── Stripe (optional) ─────────────────────────────────────────────────────────
// Set STRIPE_SECRET_KEY in .env to enable payment collection at application time.
// Without it, applications are accepted and flagged as 'stripe_pending' so admins
// can still process them manually until Stripe is configured.
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === 'sk_test_YOUR_STRIPE_SECRET_KEY_HERE') return null;
  try { return require('stripe')(key, { apiVersion: '2024-06-20' }); }
  catch { return null; }
}
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/applications  — student submits an application
router.post('/', authenticate, authorize('student'), async (req, res) => {
  const { classId, countryCode, scholarshipRequested, scholarshipType } = req.body;
  const studentId = req.user.id;

  try {
    // Block students with a pending fee waiver request
    const waiver = await db.query(
      'SELECT fee_waiver_status FROM users WHERE id = $1',
      [studentId]
    );
    if (waiver.rows[0]?.fee_waiver_status === 'pending') {
      return res.status(403).json({
        error: 'Your fee waiver request is pending super admin review. You cannot apply until it is processed.',
        code: 'WAIVER_PENDING',
      });
    }

    // Check class exists and is active
    const cls = await db.query('SELECT * FROM classes WHERE id = $1 AND is_active = TRUE', [classId]);
    if (!cls.rows[0]) return res.status(404).json({ error: 'Class not found' });

    // Check not already applied or enrolled (ignore abandoned failed/pending_payment records)
    const existing = await db.query(
      `SELECT id, status, payment_status FROM class_applications
       WHERE class_id = $1 AND student_id = $2
         AND (payment_status IS NULL OR payment_status NOT IN ('failed', 'pending_payment'))`,
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
    // Fee waived if: super admin approved a waiver, OR student is already enrolled elsewhere
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
      waiver.rows[0]?.fee_waiver_status === 'approved' ||
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
    const scholType = scholarshipRequested ? (scholarshipType || 'partial') : 'none';

    // Determine initial payment_status
    const initialPaymentStatus = feeWaived ? 'waived' : 'pending_payment';

    const result = await db.query(
      `INSERT INTO class_applications
         (class_id, student_id, country_id, application_fee_charged, currency_code, fee_waived,
          scholarship_requested, scholarship_type, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [classId, studentId, countryId, feeWaived ? 0 : feeAmount, currencyCode, feeWaived,
       scholarshipRequested || false, scholType, initialPaymentStatus]
    );
    const applicationId = result.rows[0].id;

    // ── Payment collection via Stripe ─────────────────────────────────────────
    let checkoutUrl = null;
    let stripeSessionId = null;
    let stripeNotConfigured = false;

    if (!feeWaived) {
      const stripe = getStripe();

      if (stripe) {
        // Stripe is configured — create a Checkout session
        const student = await db.query('SELECT name, email FROM users WHERE id = $1', [studentId]);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        // Only a subset of currencies are natively supported by Stripe — default to USD if unsupported
        const STRIPE_CURRENCIES = ['usd', 'eur', 'gbp', 'cad', 'aud', 'sgd', 'inr', 'mxn'];
        const chargeCurrency = STRIPE_CURRENCIES.includes(currencyCode.toLowerCase())
          ? currencyCode.toLowerCase()
          : 'usd';

        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          customer_email: student.rows[0].email,
          line_items: [{
            price_data: {
              currency: chargeCurrency,
              product_data: {
                name: `Application Fee — ${cls.rows[0].name}`,
                description: 'One-time application fee for Arintu. Waived on all future class applications.',
              },
              unit_amount: Math.round(feeAmount * 100), // Stripe uses smallest currency unit (cents)
            },
            quantity: 1,
          }],
          metadata: { applicationId, studentId, classId },
          success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url:  `${frontendUrl}/payment/cancel?app_id=${applicationId}`,
        });

        // Save session ID so the webhook and verify endpoint can find the application
        await db.query(
          'UPDATE class_applications SET stripe_session_id = $1 WHERE id = $2',
          [session.id, applicationId]
        );

        checkoutUrl = session.url;
        stripeSessionId = session.id;
      } else {
        // Stripe not yet configured — mark as stripe_pending so admins can still see it
        await db.query(
          "UPDATE class_applications SET payment_status = 'stripe_pending' WHERE id = $1",
          [applicationId]
        );
        stripeNotConfigured = true;
      }
    }

    // ── Notify admin for fee-waived or placeholder-mode applications ──────────
    // (For Stripe-paid apps the webhook/verify triggers the notification on payment confirmation)
    if (feeWaived || stripeNotConfigured) {
      const admin = await db.query('SELECT admin_id FROM classes WHERE id = $1', [classId]);
      const student = await db.query('SELECT name FROM users WHERE id = $1', [studentId]);
      if (admin.rows[0]) {
        await createNotification({
          userId: admin.rows[0].admin_id,
          title: `New application: ${cls.rows[0].name}`,
          message: `${student.rows[0]?.name} has applied to join "${cls.rows[0].name}".${stripeNotConfigured ? ' (Payment pending — Stripe not configured)' : ''}`,
          type: 'class',
          metadata: { applicationId, classId },
        });
      }
    }

    res.status(201).json({
      ...result.rows[0],
      feeWaived,
      feeAmount: feeWaived ? 0 : feeAmount,
      currencyCode,
      // Stripe fields — frontend uses these to decide what to do next
      checkoutUrl,          // non-null → redirect to Stripe
      stripeSessionId,
      stripeNotConfigured,  // true → Stripe not set up yet, show placeholder message
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/applications  — admin/superadmin sees all; student sees own
router.get('/', authenticate, async (req, res) => {
  const { status, classId, scholarshipOnly } = req.query;
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

  // Admins only see applications where payment is confirmed, waived, or pre-Stripe (legacy)
  // Students see all their own applications regardless of payment state
  if (role !== 'student') {
    where.push(`(ca.payment_status IS NULL OR ca.payment_status NOT IN ('pending_payment', 'failed'))`);
  }

  if (status) { where.push(`ca.status = $${idx++}`); params.push(status); }
  if (classId) { where.push(`ca.class_id = $${idx++}`); params.push(classId); }
  if (scholarshipOnly === 'true') { where.push(`ca.scholarship_requested = TRUE`); }

  try {
    const result = await db.query(
      `SELECT ca.*,
              u.name as student_name, u.email as student_email,
              cl.name as class_name, cl.scholarship_slots,
              co.name as country_name, co.currency_symbol,
              sr.name as scholarship_reviewer_name
       FROM class_applications ca
       JOIN users u ON u.id = ca.student_id
       JOIN classes cl ON cl.id = ca.class_id
       LEFT JOIN countries co ON co.id = ca.country_id
       LEFT JOIN users sr ON sr.id = ca.scholarship_reviewed_by
       WHERE ${where.join(' AND ')}
       ORDER BY ca.applied_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/applications/:id/scholarship  — super admin awards / updates scholarship
router.put('/:id/scholarship', authenticate, authorize('superadmin'), async (req, res) => {
  const { type, discountPct } = req.body;
  if (!['none', 'partial', 'full'].includes(type)) {
    return res.status(400).json({ error: 'type must be none, partial, or full' });
  }
  if (type === 'partial' && (discountPct == null || discountPct <= 0 || discountPct >= 100)) {
    return res.status(400).json({ error: 'Partial scholarship requires a discount percentage (1–99)' });
  }
  try {
    const result = await db.query(
      `UPDATE class_applications SET
         scholarship_type        = $2,
         scholarship_discount_pct = $3,
         scholarship_reviewed_by  = $4,
         scholarship_reviewed_at  = NOW()
       WHERE id = $1
       RETURNING *, (SELECT name FROM classes WHERE id = class_id) as class_name`,
      [req.params.id, type, type === 'partial' ? discountPct : (type === 'full' ? 100 : null), req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Application not found' });

    // Notify student if a scholarship was awarded
    if (type !== 'none') {
      const app = result.rows[0];
      const msg = type === 'full'
        ? `Congratulations! You have been awarded a full scholarship for "${app.class_name}". Your class fee is fully covered!`
        : `Congratulations! You have been awarded a partial scholarship (${discountPct}% off) for "${app.class_name}".`;
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, 'Scholarship Awarded 🎓', $2, 'info')`,
        [result.rows[0].student_id, msg]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
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
