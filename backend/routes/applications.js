const express = require('express');
const db = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const { createNotification, notifyClassMembers } = require('../services/notifications');
const emailSvc = require('../services/email');

const router = express.Router();

// ── Stripe helper ─────────────────────────────────────────────────────────────
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === 'sk_test_YOUR_STRIPE_SECRET_KEY_HERE') return null;
  try { return require('stripe')(key, { apiVersion: '2024-06-20' }); }
  catch { return null; }
}

const STRIPE_CURRENCIES = ['usd', 'eur', 'gbp', 'cad', 'aud', 'sgd', 'inr', 'mxn'];
function stripeCurrency(code) {
  return STRIPE_CURRENCIES.includes((code || '').toLowerCase())
    ? code.toLowerCase() : 'usd';
}

async function createStripeSession({ stripe, email, amount, currency, name, desc, metadata, frontendUrl, applicationId }) {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: email,
    line_items: [{
      price_data: {
        currency: stripeCurrency(currency),
        product_data: { name, description: desc },
        unit_amount: Math.round(amount * 100),
      },
      quantity: 1,
    }],
    metadata,
    success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${frontendUrl}/payment/cancel?app_id=${applicationId}`,
  });
  return session;
}

// ── POST /api/applications  ── student submits an application ─────────────────
// Phase 1: application fee (first-time students only)
// Phase 2: class tuition fee (all students after app fee is settled)
router.post('/', authenticate, authorize('student'), async (req, res) => {
  const { classId } = req.body;
  const studentId = req.user.id;

  try {
    // ── 1. Load student record (verification status + stored country) ─────────
    const userRes = await db.query(
      `SELECT u.verification_status,
              u.country_id,
              co.code            AS country_code,
              co.currency_code,
              co.currency_symbol,
              co.inr_exchange_rate
       FROM users u
       LEFT JOIN countries co ON co.id = u.country_id
       WHERE u.id = $1`,
      [studentId]
    );
    const verStatus = userRes.rows[0]?.verification_status;
    if (verStatus !== 'approved') {
      const code = verStatus === 'pending' ? 'VERIFICATION_PENDING'
                 : verStatus === 'rejected' ? 'VERIFICATION_REJECTED'
                 : 'VERIFICATION_REQUIRED';
      const msg = verStatus === 'pending'
        ? 'Your ID verification is pending review. Please wait for admin approval.'
        : verStatus === 'rejected'
        ? 'Your ID verification was rejected. Re-upload your document from the dashboard.'
        : 'You must verify your ID before enrolling. Go to your dashboard to upload.';
      return res.status(403).json({ error: msg, code });
    }

    // ── 3. Class exists and is active ─────────────────────────────────────────
    const cls = await db.query('SELECT * FROM classes WHERE id = $1 AND is_active = TRUE', [classId]);
    if (!cls.rows[0]) return res.status(404).json({ error: 'Class not found or inactive' });

    // ── 3b. Prerequisite check (all prerequisites must be met) ───────────────
    const prereqRows = await db.query(
      `SELECT cp.prerequisite_class_id, c.name as prerequisite_class_name
       FROM class_prerequisites cp
       JOIN classes c ON c.id = cp.prerequisite_class_id
       WHERE cp.class_id = $1`,
      [classId]
    );
    if (prereqRows.rows.length > 0) {
      const prereqIds = prereqRows.rows.map(r => r.prerequisite_class_id);

      // Find which prerequisites the student is NOT enrolled in
      const enrolledRes = await db.query(
        `SELECT class_id FROM enrollments WHERE class_id = ANY($1::uuid[]) AND student_id = $2`,
        [prereqIds, studentId]
      );
      const enrolledPrereqIds = new Set(enrolledRes.rows.map(r => r.class_id));

      // Check admin overrides for any not enrolled
      const notEnrolled = prereqRows.rows.filter(r => !enrolledPrereqIds.has(r.prerequisite_class_id));
      const unmet = [];
      for (const prereq of notEnrolled) {
        const override = await db.query(
          `SELECT id FROM prerequisite_approvals WHERE class_id = $1 AND student_id = $2 AND approved = TRUE`,
          [classId, studentId]
        );
        if (!override.rows[0]) unmet.push(prereq);
      }

      if (unmet.length > 0) {
        const names = unmet.map(p => `"${p.prerequisite_class_name}"`).join(', ');
        return res.status(403).json({
          error: `This class requires completion of the following prerequisite${unmet.length > 1 ? 's' : ''}: ${names}. Please enrol and complete ${unmet.length > 1 ? 'those courses' : 'that course'} first, or contact your admin for a manual approval.`,
          code: 'PREREQUISITE_REQUIRED',
          unmetPrerequisites: unmet.map(p => ({ id: p.prerequisite_class_id, name: p.prerequisite_class_name })),
        });
      }
    }

    // ── 4. No duplicate application ───────────────────────────────────────────
    const existing = await db.query(
      `SELECT id, status, payment_status, class_fee_status
       FROM class_applications
       WHERE class_id = $1 AND student_id = $2
         AND payment_status NOT IN ('failed')`,
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

    // ── 5. Is first-time student? ─────────────────────────────────────────────
    const enrollCount = await db.query(
      'SELECT COUNT(*) FROM enrollments WHERE student_id = $1',
      [studentId]
    );
    const isFirstTime = parseInt(enrollCount.rows[0].count) === 0;

    // ── 6. Application fee determination (flat 500 INR, auto-converted) ─────
    let appFeeHandled = !isFirstTime;   // returning students skip app fee
    let appFeeStatus  = 'not_required'; // for returning students
    let appFeeAmount  = null;
    let countryId     = null;
    let currencyCode  = 'USD';
    let currencySymbol = '';

    if (isFirstTime) {
      // All first-time students must pay — flat 500 INR auto-converted
      appFeeHandled = false;
      appFeeStatus  = 'pending_payment';

      // Fetch global base fee in INR (default 500)
      const settingsRes = await db.query(
        `SELECT value FROM global_settings WHERE key = 'app_fee_inr'`
      );
      const baseINR = parseFloat(settingsRes.rows[0]?.value || '500');

      // Use country stored on the student's profile (set at registration)
      const studentCountry = userRes.rows[0];
      if (studentCountry?.country_id) {
        countryId      = studentCountry.country_id;
        currencyCode   = studentCountry.currency_code   || 'USD';
        currencySymbol = studentCountry.currency_symbol || '';
        const rate     = parseFloat(studentCountry.inr_exchange_rate || 0.012);
        appFeeAmount   = Math.max(1, Math.round(baseINR * rate));
      }
      // Fallback: ~$6 USD equivalent of 500 INR
      if (!appFeeAmount) {
        appFeeAmount   = Math.max(1, Math.round(baseINR * 0.012));
        currencyCode   = 'USD';
        currencySymbol = '$';
      }
    }

    // ── 7. Class pricing ──────────────────────────────────────────────────────
    const pricingRes = await db.query(
      `SELECT cp.price, cp.currency, co.currency_symbol
       FROM class_pricing cp
       LEFT JOIN countries co ON co.currency_code = cp.currency
       WHERE cp.class_id = $1 AND cp.is_default = TRUE`,
      [classId]
    );
    const classPrice    = pricingRes.rows[0]?.price  ? parseFloat(pricingRes.rows[0].price) : null;
    const classCurrency = pricingRes.rows[0]?.currency || 'USD';
    const classCurrencySymbol = pricingRes.rows[0]?.currency_symbol || '';

    // Determine initial class_fee_status
    let classFeeStatus = 'pending'; // waiting for app fee first
    if (!classPrice || classPrice === 0) {
      classFeeStatus = 'not_required';
    } else if (appFeeHandled) {
      classFeeStatus = 'pending_payment'; // ready to pay class fee immediately
    }

    // ── 8. Insert application ─────────────────────────────────────────────────
    const result = await db.query(
      `INSERT INTO class_applications
         (class_id, student_id, country_id, application_fee_charged, currency_code, fee_waived,
          payment_status, class_fee_status, class_fee_amount, scholarship_requested, scholarship_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        classId, studentId, countryId,
        appFeeHandled ? 0 : (appFeeAmount || 0),
        currencyCode,
        appFeeStatus === 'waived',
        appFeeHandled ? 'waived' : 'pending_payment',  // payment_status = app fee status
        classFeeStatus,
        classPrice || null,
        false, 'none',
      ]
    );
    const applicationId = result.rows[0].id;
    const frontendUrl   = process.env.FRONTEND_URL || 'http://localhost:5173';
    const student       = await db.query('SELECT name, email FROM users WHERE id = $1', [studentId]);
    const stripe        = getStripe();

    let checkoutUrl    = null;
    let stripeSessionId = null;
    let feeType        = null;

    // ── 9. Create Stripe session ──────────────────────────────────────────────
    if (!appFeeHandled && appFeeAmount && appFeeAmount > 0 && stripe) {
      // Phase 1: pay application fee
      const session = await createStripeSession({
        stripe,
        email: student.rows[0].email,
        amount: appFeeAmount,
        currency: currencyCode,
        name: `Application Fee — ${cls.rows[0].name}`,
        desc: `One-time registration fee. Waived on all future class applications.`,
        metadata: { applicationId, studentId, classId, feeType: 'app_fee' },
        frontendUrl,
        applicationId,
      });
      await db.query('UPDATE class_applications SET stripe_session_id = $1 WHERE id = $2', [session.id, applicationId]);
      checkoutUrl    = session.url;
      stripeSessionId = session.id;
      feeType        = 'app_fee';

    } else if (classFeeStatus === 'pending_payment' && classPrice && classPrice > 0 && stripe) {
      // Phase 2: pay class tuition fee (app fee already handled)
      const session = await createStripeSession({
        stripe,
        email: student.rows[0].email,
        amount: classPrice,
        currency: classCurrency,
        name: `Class Fee — ${cls.rows[0].name}`,
        desc: `Tuition fee for the class.`,
        metadata: { applicationId, studentId, classId, feeType: 'class_fee' },
        frontendUrl,
        applicationId,
      });
      await db.query('UPDATE class_applications SET class_fee_stripe_session_id = $1 WHERE id = $2', [session.id, applicationId]);
      checkoutUrl    = session.url;
      stripeSessionId = session.id;
      feeType        = 'class_fee';

    } else if (classFeeStatus === 'not_required') {
      // Free class — enroll immediately
      await db.query(`UPDATE class_applications SET status = 'approved', class_fee_status = 'not_required' WHERE id = $1`, [applicationId]);
      await db.query(
        `INSERT INTO enrollments (class_id, student_id, payment_status) VALUES ($1,$2,'paid') ON CONFLICT DO NOTHING`,
        [classId, studentId]
      );
      const admin = await db.query('SELECT admin_id FROM classes WHERE id = $1', [classId]);
      if (admin.rows[0]) {
        await createNotification({
          userId: admin.rows[0].admin_id,
          title: `New enrolment: ${cls.rows[0].name}`,
          message: `${student.rows[0].name} enrolled in "${cls.rows[0].name}" (free class).`,
          type: 'class',
          metadata: { applicationId, classId },
        });
      }
    }

    res.status(201).json({
      ...result.rows[0],
      isFirstTime,
      appFeeRequired:      !appFeeHandled,
      appFeeAmount,
      appFeeCurrencyCode:  currencyCode,
      appFeeCurrencySymbol: currencySymbol,
      classPrice,
      classCurrency,
      classCurrencySymbol,
      checkoutUrl,
      stripeSessionId,
      feeType,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/applications/:id/retry-app-fee ── recreate Stripe session for app fee
router.post('/:id/retry-app-fee', authenticate, authorize('student'), async (req, res) => {
  try {
    const app = await db.query(
      `SELECT ca.*, cl.name as class_name,
              co.currency_code, co.currency_symbol,
              af.fee as country_app_fee
       FROM class_applications ca
       JOIN classes cl ON cl.id = ca.class_id
       LEFT JOIN countries co ON co.id = ca.country_id
       LEFT JOIN application_fees af ON af.country_id = ca.country_id
       WHERE ca.id = $1 AND ca.student_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!app.rows[0]) return res.status(404).json({ error: 'Application not found' });

    const a = app.rows[0];
    if (a.payment_status !== 'pending_payment') {
      return res.status(400).json({ error: `Application fee already settled (status: ${a.payment_status})` });
    }

    // fee amount: stored at application time as application_fee_charged
    const feeAmount = parseFloat(a.application_fee_charged || a.country_app_fee || 15);
    if (!feeAmount || feeAmount === 0) {
      return res.status(400).json({ error: 'No application fee amount on record' });
    }

    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ error: 'Payment processing not configured' });

    const student = await db.query('SELECT name, email FROM users WHERE id = $1', [req.user.id]);
    const currency = a.currency_code || 'USD';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const session = await createStripeSession({
      stripe,
      email: student.rows[0].email,
      amount: feeAmount,
      currency,
      name: `Application Fee — ${a.class_name}`,
      desc: 'One-time registration fee. Waived on all future class applications.',
      metadata: { applicationId: a.id, studentId: req.user.id, classId: a.class_id, feeType: 'app_fee' },
      frontendUrl,
      applicationId: a.id,
    });

    await db.query('UPDATE class_applications SET stripe_session_id = $1 WHERE id = $2', [session.id, a.id]);

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PUT /api/applications/:id/request-scholarship ── student requests scholarship
router.put('/:id/request-scholarship', authenticate, authorize('student'), async (req, res) => {
  const { reason } = req.body;
  try {
    // Verify this application belongs to the student and is in the right state
    const app = await db.query(
      `SELECT id, class_fee_status, payment_status FROM class_applications
       WHERE id = $1 AND student_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!app.rows[0]) return res.status(404).json({ error: 'Application not found' });

    const { class_fee_status, payment_status } = app.rows[0];
    if (!['pending_payment'].includes(class_fee_status)) {
      return res.status(400).json({
        error: `Cannot request scholarship in current state (${class_fee_status}). App fee must be settled first.`,
      });
    }

    const result = await db.query(
      `UPDATE class_applications
       SET scholarship_requested = TRUE,
           scholarship_type      = 'pending',
           scholarship_reason    = $1,
           class_fee_status      = 'scholarship_pending'
       WHERE id = $2
       RETURNING *`,
      [reason || null, req.params.id]
    );

    // Notify admin(s) of the class
    const cls = await db.query(
      `SELECT cl.name, cl.admin_id, u.name as student_name
       FROM class_applications ca
       JOIN classes cl ON cl.id = ca.class_id
       JOIN users u ON u.id = ca.student_id
       WHERE ca.id = $1`,
      [req.params.id]
    );
    if (cls.rows[0]?.admin_id) {
      await createNotification({
        userId: cls.rows[0].admin_id,
        title: `Scholarship request: ${cls.rows[0].name}`,
        message: `${cls.rows[0].student_name} has requested a scholarship for "${cls.rows[0].name}".`,
        type: 'class',
        metadata: { applicationId: req.params.id },
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/applications/:id/pay-class-fee ── create Stripe session for class fee
router.post('/:id/pay-class-fee', authenticate, authorize('student'), async (req, res) => {
  try {
    const app = await db.query(
      `SELECT ca.*, cl.name as class_name, cl.id as class_id_val
       FROM class_applications ca
       JOIN classes cl ON cl.id = ca.class_id
       WHERE ca.id = $1 AND ca.student_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!app.rows[0]) return res.status(404).json({ error: 'Application not found' });

    const a = app.rows[0];
    if (a.class_fee_status !== 'pending_payment') {
      return res.status(400).json({ error: `Class fee is not ready for payment (status: ${a.class_fee_status})` });
    }
    if (!a.class_fee_amount || parseFloat(a.class_fee_amount) === 0) {
      return res.status(400).json({ error: 'No class fee amount set' });
    }

    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ error: 'Payment processing not configured' });

    const student = await db.query('SELECT name, email FROM users WHERE id = $1', [req.user.id]);
    const pricingRes = await db.query(
      'SELECT currency FROM class_pricing WHERE class_id = $1 AND is_default = TRUE',
      [a.class_id]
    );
    const currency = pricingRes.rows[0]?.currency || 'USD';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const session = await createStripeSession({
      stripe,
      email: student.rows[0].email,
      amount: parseFloat(a.class_fee_amount),
      currency,
      name: `Class Fee — ${a.class_name}`,
      desc: a.scholarship_discount_pct
        ? `Discounted class fee (${a.scholarship_discount_pct}% scholarship applied)`
        : 'Class tuition fee',
      metadata: { applicationId: a.id, studentId: req.user.id, classId: a.class_id, feeType: 'class_fee' },
      frontendUrl,
      applicationId: a.id,
    });

    await db.query(
      'UPDATE class_applications SET class_fee_stripe_session_id = $1 WHERE id = $2',
      [session.id, a.id]
    );

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/applications ── student sees own; admin sees class's paid apps ───
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
    // Admins only see apps where app fee is settled
    where.push(`(ca.payment_status IS NULL OR ca.payment_status NOT IN ('pending_payment', 'failed'))`);
  } else if (role === 'superadmin') {
    // See all except failed payment attempts
    where.push(`(ca.payment_status IS NULL OR ca.payment_status NOT IN ('failed'))`);
  }

  if (status)  { where.push(`ca.status = $${idx++}`);    params.push(status); }
  if (classId) { where.push(`ca.class_id = $${idx++}`);  params.push(classId); }
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
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PUT /api/applications/:id/scholarship ── admin awards / updates scholarship
router.put('/:id/scholarship', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  const { type, discountPct, action } = req.body; // action: 'approve' | 'reject'

  // 'reject' action — cancel scholarship, restore to pending_payment
  if (action === 'reject') {
    try {
      // Fetch current app state + original class price before updating
      const appRes = await db.query(
        `SELECT ca.*, cp.price as original_class_price,
                (SELECT name FROM classes WHERE id = ca.class_id) as class_name
         FROM class_applications ca
         LEFT JOIN class_pricing cp ON cp.class_id = ca.class_id AND cp.is_default = TRUE
         WHERE ca.id = $1`,
        [req.params.id]
      );
      if (!appRes.rows[0]) return res.status(404).json({ error: 'Application not found' });
      const app = appRes.rows[0];

      const wasFullScholarship = app.class_fee_status === 'full_scholarship';
      const originalPrice = parseFloat(app.original_class_price || 0) || null;

      const result = await db.query(
        `UPDATE class_applications
         SET scholarship_type         = 'none',
             scholarship_discount_pct = NULL,
             scholarship_reviewed_by  = $1,
             scholarship_reviewed_at  = NOW(),
             class_fee_status         = 'pending_payment',
             class_fee_amount         = $2,
             status                   = 'pending'
         WHERE id = $3
         RETURNING *`,
        [req.user.id, originalPrice, req.params.id]
      );

      // If the student was auto-enrolled via full scholarship, remove that enrollment
      if (wasFullScholarship) {
        await db.query(
          'DELETE FROM enrollments WHERE class_id = $1 AND student_id = $2',
          [app.class_id, app.student_id]
        );
      }

      await db.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,'info')`,
        [app.student_id,
         'Scholarship request update',
         `Your scholarship request for "${app.class_name}" was not approved. You can still enrol by paying the full class fee.`]
      );
      const studRevoked = await db.query('SELECT name, email FROM users WHERE id = $1', [app.student_id]);
      emailSvc.sendScholarshipRevoked(studRevoked.rows[0].email, studRevoked.rows[0].name, app.class_name).catch(() => {});
      return res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // 'approve' action — set scholarship type
  if (!['partial', 'full'].includes(type)) {
    return res.status(400).json({ error: 'type must be partial or full' });
  }
  if (type === 'partial' && (discountPct == null || discountPct <= 0 || discountPct >= 100)) {
    return res.status(400).json({ error: 'Partial scholarship requires a discount percentage (1–99)' });
  }

  try {
    const appRes = await db.query(
      `SELECT ca.*, cl.name as class_name
       FROM class_applications ca JOIN classes cl ON cl.id = ca.class_id
       WHERE ca.id = $1`,
      [req.params.id]
    );
    if (!appRes.rows[0]) return res.status(404).json({ error: 'Application not found' });
    const app = appRes.rows[0];

    let newClassFeeStatus = 'pending_payment';
    let newClassFeeAmount = parseFloat(app.class_fee_amount || 0);

    if (type === 'full') {
      newClassFeeStatus = 'full_scholarship';
      newClassFeeAmount = 0;
    } else if (type === 'partial') {
      newClassFeeAmount = Math.max(0, newClassFeeAmount * (1 - discountPct / 100));
    }

    const result = await db.query(
      `UPDATE class_applications SET
         scholarship_type         = $1,
         scholarship_discount_pct = $2,
         scholarship_reviewed_by  = $3,
         scholarship_reviewed_at  = NOW(),
         class_fee_status         = $4,
         class_fee_amount         = $5
       WHERE id = $6
       RETURNING *`,
      [type, type === 'partial' ? discountPct : 100, req.user.id,
       newClassFeeStatus, newClassFeeAmount, req.params.id]
    );

    // Full scholarship → auto-approve + enroll
    if (type === 'full') {
      await db.query(
        `UPDATE class_applications SET status = 'approved', class_fee_paid_at = NOW() WHERE id = $1`,
        [req.params.id]
      );
      await db.query(
        `INSERT INTO enrollments (class_id, student_id, payment_status)
         VALUES ($1,$2,'paid') ON CONFLICT DO NOTHING`,
        [app.class_id, app.student_id]
      );
    }

    const msg = type === 'full'
      ? `Congratulations! You have been awarded a full scholarship for "${app.class_name}". You are now enrolled!`
      : `Your scholarship request for "${app.class_name}" was approved — ${discountPct}% off the class fee. Please proceed to payment.`;

    await db.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,'info')`,
      [app.student_id, 'Scholarship decision', msg]
    );
    const studScholar = await db.query('SELECT name, email FROM users WHERE id = $1', [app.student_id]);
    emailSvc.sendScholarshipAwarded(studScholar.rows[0].email, studScholar.rows[0].name, app.class_name, type, discountPct).catch(() => {});

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PUT /api/applications/:id/approve ── admin enrols student (manual override)
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

    const { class_id, student_id, payment_status } = app.rows[0];
    const enrollPaymentStatus = payment_status === 'paid' ? 'paid' : 'pending';
    await client.query(
      `INSERT INTO enrollments (class_id, student_id, enrolled_by, payment_status)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [class_id, student_id, req.user.id, enrollPaymentStatus]
    );
    await client.query('COMMIT');

    const cls = await db.query('SELECT name FROM classes WHERE id = $1', [class_id]);
    await createNotification({
      userId: student_id,
      title: 'Application approved!',
      message: `Your application for "${cls.rows[0]?.name}" has been approved. You are now enrolled.`,
      type: 'class',
      metadata: { classId: class_id },
    });

    // Email notification
    const studentInfo = await db.query('SELECT name, email FROM users WHERE id = $1', [student_id]);
    emailSvc.sendApplicationApproved(studentInfo.rows[0].email, studentInfo.rows[0].name, cls.rows[0]?.name).catch(() => {});

    res.json(app.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// ── PUT /api/applications/:id/reject ── admin rejects application
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
  const studentRej = await db.query('SELECT name, email FROM users WHERE id = $1', [student_id]);
  emailSvc.sendApplicationRejected(studentRej.rows[0].email, studentRej.rows[0].name, cls.rows[0]?.name, notes).catch(() => {});
  await createNotification({
    userId: student_id,
    title: 'Application update',
    message: `Your application for "${cls.rows[0]?.name}" was not approved.${notes ? ' Note: ' + notes : ''}`,
    type: 'class',
  });

  res.json(result.rows[0]);
});

module.exports = router;
