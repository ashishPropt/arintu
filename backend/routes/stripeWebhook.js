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
const db      = require('../database/db');
const emailSvc = require('../services/email');

module.exports = async function stripeWebhook(req, res) {
  // ── Stripe configuration ──────────────────────────────────────────────────────
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret   = process.env.STRIPE_WEBHOOK_SECRET;

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
    console.warn('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not set — skipping signature verification');
    try {
      event = JSON.parse(req.body.toString());
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }

  // ── checkout.session.completed ────────────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { applicationId, feeType } = session.metadata || {};

    if (applicationId && session.payment_status === 'paid') {
      try {
        if (feeType === 'app_fee') {
          // ── Application fee paid ────────────────────────────────────────────
          const updated = await db.query(
            `UPDATE class_applications
             SET payment_status        = 'paid',
                 stripe_payment_intent = $1,
                 payment_completed_at  = NOW()
             WHERE id = $2 AND payment_status = 'pending_payment'
             RETURNING *,
               (SELECT name FROM classes WHERE id = class_id) AS class_name,
               (SELECT name FROM users   WHERE id = student_id) AS student_name,
               (SELECT email FROM users  WHERE id = student_id) AS student_email`,
            [session.payment_intent, applicationId]
          );

          if (updated.rows[0]) {
            const app = updated.rows[0];

            if (app.class_fee_status === 'not_required') {
              // Free class — auto-approve and enroll immediately
              await db.query(
                `UPDATE class_applications SET status = 'approved' WHERE id = $1`,
                [applicationId]
              );
              await db.query(
                `INSERT INTO enrollments (class_id, student_id, payment_status)
                 VALUES ($1, $2, 'paid') ON CONFLICT DO NOTHING`,
                [app.class_id, app.student_id]
              );
              await db.query(
                `INSERT INTO notifications (user_id, title, message, type)
                 VALUES ($1, $2, $3, 'class')`,
                [app.student_id,
                 `Enrolled: ${app.class_name}`,
                 `You have been enrolled in "${app.class_name}". Welcome!`]
              );
              emailSvc.sendEnrolled(app.student_email, app.student_name, app.class_name).catch(() => {});
              console.log(`[Stripe Webhook] Auto-enrolled student in free class after app fee: ${applicationId}`);

            } else if (app.class_fee_status === 'pending') {
              // Paid class — unlock the class fee payment step
              await db.query(
                `UPDATE class_applications SET class_fee_status = 'pending_payment'
                 WHERE id = $1 AND class_fee_status = 'pending'`,
                [applicationId]
              );
              // Notify student to proceed to class fee payment
              await db.query(
                `INSERT INTO notifications (user_id, title, message, type)
                 VALUES ($1, $2, $3, 'class')`,
                [app.student_id,
                 `Application fee received — next step`,
                 `Your application fee for "${app.class_name}" was received. Please proceed to pay the class fee to complete your enrolment.`]
              );
              console.log(`[Stripe Webhook] App fee paid, class fee unlocked: ${applicationId}`);

            } else {
              // Unexpected state — log but don't crash
              console.log(`[Stripe Webhook] App fee paid, class_fee_status=${app.class_fee_status}: ${applicationId}`);
            }
          }

        } else if (feeType === 'class_fee') {
          // ── Class fee paid (returned student, or after app fee settled) ─────
          // Fetch application directly (payment_status may be 'waived' for returning students)
          const appRes = await db.query(
            `SELECT ca.*,
               (SELECT name  FROM classes WHERE id = ca.class_id) AS class_name,
               (SELECT name  FROM users   WHERE id = ca.student_id) AS student_name,
               (SELECT email FROM users   WHERE id = ca.student_id) AS student_email,
               (SELECT admin_id FROM classes WHERE id = ca.class_id) AS class_admin_id
             FROM class_applications ca WHERE ca.id = $1`,
            [applicationId]
          );

          if (appRes.rows[0]) {
            const app = appRes.rows[0];

            // Update class fee status, approve, and enroll
            await db.query(
              `UPDATE class_applications
               SET class_fee_status        = 'paid',
                   class_fee_paid_at       = NOW(),
                   status                  = 'approved',
                   stripe_payment_intent   = COALESCE(stripe_payment_intent, $1)
               WHERE id = $2`,
              [session.payment_intent, applicationId]
            );

            await db.query(
              `INSERT INTO enrollments (class_id, student_id, payment_status)
               VALUES ($1, $2, 'paid') ON CONFLICT DO NOTHING`,
              [app.class_id, app.student_id]
            );

            // Notify student
            await db.query(
              `INSERT INTO notifications (user_id, title, message, type)
               VALUES ($1, $2, $3, 'class')`,
              [app.student_id,
               `Enrolled: ${app.class_name}`,
               `Your payment was received and you are now enrolled in "${app.class_name}". Welcome!`]
            );
            emailSvc.sendEnrolled(app.student_email, app.student_name, app.class_name).catch(() => {});

            // Notify class admin
            if (app.class_admin_id) {
              await db.query(
                `INSERT INTO notifications (user_id, title, message, type)
                 VALUES ($1, $2, $3, 'class')`,
                [app.class_admin_id,
                 `New enrolment: ${app.class_name}`,
                 `${app.student_name} has paid and is now enrolled in "${app.class_name}".`]
              );
            }
            console.log(`[Stripe Webhook] Auto-enrolled after class fee payment: ${applicationId}`);
          }

        } else {
          // Legacy / unknown feeType — original behaviour (mark payment_status paid)
          const updated = await db.query(
            `UPDATE class_applications
             SET payment_status = 'paid', stripe_payment_intent = $1, payment_completed_at = NOW()
             WHERE id = $2 AND payment_status = 'pending_payment'
             RETURNING *,
               (SELECT name FROM classes WHERE id = class_id) AS class_name,
               (SELECT name FROM users   WHERE id = student_id) AS student_name`,
            [session.payment_intent, applicationId]
          );
          if (updated.rows[0]) {
            const app = updated.rows[0];
            const adminRes = await db.query('SELECT admin_id FROM classes WHERE id = $1', [app.class_id]);
            if (adminRes.rows[0]) {
              await db.query(
                `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,'class')`,
                [adminRes.rows[0].admin_id,
                 `New application: ${app.class_name}`,
                 `${app.student_name} applied to "${app.class_name}" and completed payment.`]
              );
            }
          }
        }

      } catch (err) {
        console.error('[Stripe Webhook] DB error on checkout.session.completed:', err);
        return res.status(500).end();
      }
    }
  }

  // ── checkout.session.expired ──────────────────────────────────────────────────
  if (event.type === 'checkout.session.expired') {
    const session  = event.data.object;
    const { applicationId, feeType } = session.metadata || {};
    if (applicationId) {
      if (feeType === 'class_fee') {
        // Mark class fee as failed (leave payment_status alone)
        await db.query(
          `UPDATE class_applications SET class_fee_status = 'failed' WHERE id = $1`,
          [applicationId]
        ).catch((err) => console.error('[Stripe Webhook] failed to mark class_fee expired:', err));
      } else {
        await db.query(
          `UPDATE class_applications SET payment_status = 'failed'
           WHERE id = $1 AND payment_status = 'pending_payment'`,
          [applicationId]
        ).catch((err) => console.error('[Stripe Webhook] failed to mark expired:', err));
      }
    }
  }

  res.json({ received: true });
};
