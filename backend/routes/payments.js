/**
 * Payment routes — Stripe Checkout session verification and cancellation.
 *
 * ── Required environment variables ───────────────────────────────────────────
 *   STRIPE_SECRET_KEY=sk_live_...
 *   FRONTEND_URL=http://yourdomain.com
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const db = require('../database/db');

const router = express.Router();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === 'sk_test_YOUR_STRIPE_SECRET_KEY_HERE') return null;
  try {
    return require('stripe')(key, { apiVersion: '2024-06-20' });
  } catch {
    return null;
  }
}

// ── GET /api/payments/verify/:sessionId ──────────────────────────────────────
// Called by PaymentSuccess page after Stripe redirects back.
// Works for BOTH app-fee and class-fee sessions.
router.get('/verify/:sessionId', authenticate, async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ error: 'Payment processing not configured.', code: 'STRIPE_NOT_CONFIGURED' });
  }

  const { sessionId } = req.params;

  try {
    // Find the application — the session ID may be stored in either column
    const appRes = await db.query(
      `SELECT ca.*,
              u.name  AS student_name,
              u.email AS student_email,
              cl.name AS class_name,
              cl.admin_id,
              CASE
                WHEN ca.stripe_session_id           = $1 THEN 'app_fee'
                WHEN ca.class_fee_stripe_session_id = $1 THEN 'class_fee'
              END AS matched_fee_type
       FROM class_applications ca
       JOIN users   u  ON u.id  = ca.student_id
       JOIN classes cl ON cl.id = ca.class_id
       WHERE ca.stripe_session_id = $1 OR ca.class_fee_stripe_session_id = $1`,
      [sessionId]
    );

    if (!appRes.rows[0]) {
      return res.status(404).json({ error: 'No application found for this payment session.' });
    }
    const app     = appRes.rows[0];
    const feeType = app.matched_fee_type; // 'app_fee' | 'class_fee'

    // Only the student who initiated the session can verify it
    if (app.student_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // ── Already-confirmed shortcuts ───────────────────────────────────────────
    if (feeType === 'app_fee' && app.payment_status === 'paid') {
      return res.json({
        paid: true,
        feeType: 'app_fee',
        nextStep: app.class_fee_status === 'not_required' ? 'enrolled' : 'class_fee',
        application: app,
      });
    }
    if (feeType === 'class_fee' && app.class_fee_status === 'paid') {
      return res.json({ paid: true, feeType: 'class_fee', enrolled: true, application: app });
    }

    // ── Check with Stripe ─────────────────────────────────────────────────────
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.json({ paid: false, paymentStatus: session.payment_status });
    }

    // ── Process confirmed payment ─────────────────────────────────────────────
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      if (feeType === 'app_fee') {
        // ── Application fee paid ──────────────────────────────────────────────
        // Determine class fee status: if free class → auto-enroll now
        const isFreeClass = !app.class_fee_amount || parseFloat(app.class_fee_amount) === 0;
        const newClassFeeStatus = isFreeClass ? 'not_required' : 'pending_payment';

        const updated = await client.query(
          `UPDATE class_applications
           SET payment_status        = 'paid',
               stripe_payment_intent  = $1,
               payment_completed_at   = NOW(),
               class_fee_status       = $2
           WHERE stripe_session_id = $3
           RETURNING *`,
          [session.payment_intent, newClassFeeStatus, sessionId]
        );

        if (isFreeClass) {
          // Free class: auto-approve + enroll
          await client.query(
            `UPDATE class_applications SET status = 'approved', reviewed_at = NOW() WHERE id = $1`,
            [app.id]
          );
          await client.query(
            `INSERT INTO enrollments (class_id, student_id, payment_status)
             VALUES ($1, $2, 'paid') ON CONFLICT DO NOTHING`,
            [app.class_id, app.student_id]
          );
        }

        await client.query('COMMIT');

        // Notify student: app fee paid, next step is class fee (or enrolled if free)
        const studentMsg = isFreeClass
          ? `Your application fee was confirmed and you are now enrolled in "${app.class_name}".`
          : `Your application fee was confirmed. You can now proceed to pay the class fee for "${app.class_name}".`;

        await db.query(
          `INSERT INTO notifications (user_id, title, message, type)
           VALUES ($1, $2, $3, 'class')`,
          [
            app.student_id,
            isFreeClass ? `Enrolled in ${app.class_name}!` : `Application fee received — ${app.class_name}`,
            studentMsg,
          ]
        );

        return res.json({
          paid: true,
          feeType: 'app_fee',
          nextStep: isFreeClass ? 'enrolled' : 'class_fee',
          enrolled: isFreeClass,
          application: {
            ...updated.rows[0],
            class_name: app.class_name,
            student_name: app.student_name,
          },
        });

      } else {
        // ── Class fee paid ────────────────────────────────────────────────────
        const updated = await client.query(
          `UPDATE class_applications
           SET class_fee_status         = 'paid',
               class_fee_payment_intent  = $1,
               class_fee_paid_at         = NOW(),
               status                    = 'approved',
               reviewed_at               = NOW()
           WHERE class_fee_stripe_session_id = $2
           RETURNING *`,
          [session.payment_intent, sessionId]
        );

        // Add to enrollments
        await client.query(
          `INSERT INTO enrollments (class_id, student_id, payment_status)
           VALUES ($1, $2, 'paid') ON CONFLICT DO NOTHING`,
          [app.class_id, app.student_id]
        );

        await client.query('COMMIT');

        // Notify admin
        if (app.admin_id) {
          await db.query(
            `INSERT INTO notifications (user_id, title, message, type)
             SELECT $1, $2, $3, 'class'
             WHERE NOT EXISTS (
               SELECT 1 FROM notifications
               WHERE user_id = $1 AND message LIKE $4
             )`,
            [
              app.admin_id,
              `New enrolment: ${app.class_name}`,
              `${app.student_name} paid and enrolled in "${app.class_name}".`,
              `%${app.student_name}% enrolled%${app.class_name}%`,
            ]
          );
        }

        // Notify student
        await db.query(
          `INSERT INTO notifications (user_id, title, message, type)
           VALUES ($1, $2, $3, 'class')`,
          [
            app.student_id,
            `You are enrolled in ${app.class_name}!`,
            `Your payment was confirmed and you are now enrolled in "${app.class_name}".`,
          ]
        );

        return res.json({
          paid: true,
          feeType: 'class_fee',
          enrolled: true,
          application: {
            ...updated.rows[0],
            class_name: app.class_name,
            student_name: app.student_name,
          },
        });
      }
    } catch (innerErr) {
      await client.query('ROLLBACK');
      throw innerErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[Stripe] verify error:', err);
    res.status(500).json({ error: 'Failed to verify payment. Please contact support.' });
  }
});

// ── DELETE /api/payments/cancel/:applicationId ────────────────────────────────
// Called when student cancels from Stripe Checkout.
// - If app fee not yet paid → delete the application entirely (student can retry)
// - If app fee already paid (cancelling class fee checkout) → do nothing, keep state
router.delete('/cancel/:applicationId', authenticate, async (req, res) => {
  try {
    const app = await db.query(
      `SELECT id, payment_status FROM class_applications
       WHERE id = $1 AND student_id = $2`,
      [req.params.applicationId, req.user.id]
    );

    if (!app.rows[0]) return res.json({ ok: true }); // already gone or not theirs

    const { payment_status } = app.rows[0];

    // Only delete if the app fee was never paid (true cancellation)
    if (payment_status === 'pending_payment') {
      await db.query(
        `DELETE FROM class_applications WHERE id = $1 AND student_id = $2 AND payment_status = 'pending_payment'`,
        [req.params.applicationId, req.user.id]
      );
    }
    // If app fee is paid/waived, we keep the application and just let the student retry class fee later

    res.json({ ok: true });
  } catch (err) {
    console.error('[Payments] cancel error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
