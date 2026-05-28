/**
 * Payment routes — Stripe Checkout session verification and cancellation.
 *
 * ── Required environment variables (add to .env on the server) ───────────────
 *   STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY_HERE
 *   STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SIGNING_SECRET_HERE
 *
 * ── Stripe dashboard setup ───────────────────────────────────────────────────
 *   1. Create a Stripe account at https://stripe.com
 *   2. Copy your Secret Key from Dashboard → Developers → API Keys
 *   3. Register a webhook at Dashboard → Developers → Webhooks
 *      Endpoint: https://yourdomain.com/api/payments/webhook
 *      Events: checkout.session.completed, checkout.session.expired
 *   4. Copy the Webhook Signing Secret and add to .env as STRIPE_WEBHOOK_SECRET
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const db = require('../database/db');

const router = express.Router();

// Lazily initialise Stripe so the server starts even without the package installed
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === 'sk_test_YOUR_STRIPE_SECRET_KEY_HERE') return null;
  try {
    return require('stripe')(key, { apiVersion: '2024-06-20' });
  } catch {
    return null;
  }
}

// GET /api/payments/verify/:sessionId
// Called by the PaymentSuccess page after Stripe redirects the user back.
// Confirms the payment was received and marks the application as paid.
router.get('/verify/:sessionId', authenticate, async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ error: 'Payment processing not configured.', code: 'STRIPE_NOT_CONFIGURED' });
  }

  const { sessionId } = req.params;

  try {
    // Find the associated application
    const appRes = await db.query(
      `SELECT ca.*,
              u.name  AS student_name,
              cl.name AS class_name
       FROM class_applications ca
       JOIN users   u  ON u.id  = ca.student_id
       JOIN classes cl ON cl.id = ca.class_id
       WHERE ca.stripe_session_id = $1`,
      [sessionId]
    );

    if (!appRes.rows[0]) {
      return res.status(404).json({ error: 'No application found for this payment session.' });
    }
    const app = appRes.rows[0];

    // Only the student who initiated the session can verify it
    if (app.student_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Already confirmed — return immediately
    if (app.payment_status === 'paid') {
      return res.json({ paid: true, application: app });
    }

    // Check with Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      const updated = await db.query(
        `UPDATE class_applications
         SET payment_status        = 'paid',
             stripe_payment_intent  = $1,
             payment_completed_at   = NOW()
         WHERE stripe_session_id = $2
         RETURNING *`,
        [session.payment_intent, sessionId]
      );

      // Notify admin (in case webhook was slow / missed)
      const adminRes = await db.query('SELECT admin_id FROM classes WHERE id = $1', [app.class_id]);
      if (adminRes.rows[0]) {
        // Use ON CONFLICT DO NOTHING pattern — webhook may have already inserted
        await db.query(
          `INSERT INTO notifications (user_id, title, message, type)
           SELECT $1, $2, $3, 'class'
           WHERE NOT EXISTS (
             SELECT 1 FROM notifications
             WHERE user_id = $1 AND message LIKE $4
           )`,
          [
            adminRes.rows[0].admin_id,
            `New application: ${app.class_name}`,
            `${app.student_name} applied to "${app.class_name}" and completed payment.`,
            `%${app.class_name}%`,
          ]
        );
      }

      return res.json({
        paid: true,
        application: {
          ...updated.rows[0],
          class_name: app.class_name,
          student_name: app.student_name,
        },
      });
    }

    // Payment not yet confirmed (e.g. user arrived at success URL before Stripe processed)
    res.json({ paid: false, paymentStatus: session.payment_status });
  } catch (err) {
    console.error('[Stripe] verify error:', err);
    res.status(500).json({ error: 'Failed to verify payment. Please contact support.' });
  }
});

// DELETE /api/payments/cancel/:applicationId
// Called when the student cancels from the Stripe Checkout page.
// Removes the pending application so they can try again later.
router.delete('/cancel/:applicationId', authenticate, async (req, res) => {
  try {
    await db.query(
      `DELETE FROM class_applications
       WHERE id = $1 AND student_id = $2 AND payment_status = 'pending_payment'`,
      [req.params.applicationId, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[Payments] cancel error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
