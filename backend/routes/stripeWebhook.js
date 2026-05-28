/**
 * Stripe webhook handler — must receive the RAW request body (not parsed JSON).
 * Registered in server.js BEFORE express.json() with express.raw() middleware.
 *
 * To set up in Stripe dashboard:
 *   Endpoint URL: https://yourdomain.com/api/payments/webhook
 *   Events to listen for:
 *     - checkout.session.completed
 *     - checkout.session.expired
 *
 * Set STRIPE_WEBHOOK_SECRET in .env to the signing secret from the Stripe dashboard.
 */
const db = require('../database/db');

module.exports = async function stripeWebhook(req, res) {
  // ── Stripe configuration placeholder ────────────────────────────────────────
  // Required env vars (set in /opt/arintu/backend/.env on the server):
  //   STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY_HERE
  //   STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SIGNING_SECRET_HERE
  // ────────────────────────────────────────────────────────────────────────────

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || stripeSecretKey === 'sk_test_YOUR_STRIPE_SECRET_KEY_HERE') {
    console.warn('[Stripe Webhook] STRIPE_SECRET_KEY not configured — ignoring webhook');
    return res.json({ received: true });
  }

  let stripe;
  try {
    stripe = require('stripe')(stripeSecretKey, { apiVersion: '2024-06-20' });
  } catch (e) {
    console.error('[Stripe Webhook] stripe package not installed. Run: npm install stripe');
    return res.status(500).json({ error: 'Stripe not available' });
  }

  let event;
  if (webhookSecret && webhookSecret !== 'whsec_YOUR_WEBHOOK_SIGNING_SECRET_HERE') {
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'],
        webhookSecret
      );
    } catch (err) {
      console.error('[Stripe Webhook] Signature verification failed:', err.message);
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
  } else {
    // Webhook secret not configured — parse body manually (development only, insecure)
    console.warn('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not set — skipping signature verification');
    try {
      event = JSON.parse(req.body.toString());
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }

  // ── Handle events ────────────────────────────────────────────────────────────

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { applicationId } = session.metadata || {};

    if (applicationId && session.payment_status === 'paid') {
      try {
        const updated = await db.query(
          `UPDATE class_applications
           SET payment_status       = 'paid',
               stripe_payment_intent = $1,
               payment_completed_at  = NOW()
           WHERE id = $2 AND payment_status = 'pending_payment'
           RETURNING *,
             (SELECT name FROM classes WHERE id = class_id) as class_name,
             (SELECT name FROM users   WHERE id = student_id) as student_name`,
          [session.payment_intent, applicationId]
        );

        if (updated.rows[0]) {
          const app = updated.rows[0];
          // Notify class admin
          const adminRes = await db.query(
            'SELECT admin_id FROM classes WHERE id = $1',
            [app.class_id]
          );
          if (adminRes.rows[0]) {
            await db.query(
              `INSERT INTO notifications (user_id, title, message, type)
               VALUES ($1, $2, $3, 'class')`,
              [
                adminRes.rows[0].admin_id,
                `New application: ${app.class_name}`,
                `${app.student_name} applied to "${app.class_name}" and completed payment.`,
              ]
            );
          }
          console.log(`[Stripe Webhook] Application ${applicationId} marked paid`);
        }
      } catch (err) {
        console.error('[Stripe Webhook] DB error on checkout.session.completed:', err);
        return res.status(500).end();
      }
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object;
    const { applicationId } = session.metadata || {};
    if (applicationId) {
      await db.query(
        `UPDATE class_applications SET payment_status = 'failed'
         WHERE id = $1 AND payment_status = 'pending_payment'`,
        [applicationId]
      ).catch((err) => console.error('[Stripe Webhook] failed to mark expired:', err));
    }
  }

  res.json({ received: true });
};
