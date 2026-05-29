/**
 * Email service — sends transactional emails via SMTP (nodemailer).
 * Set SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS in .env to enable.
 * When not configured, messages are logged to console (no crash).
 */
const nodemailer = require('nodemailer');

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587'),
    secure: parseInt(SMTP_PORT || '587') === 465,
    auth: {
      user: SMTP_USER.trim(),
      pass: SMTP_PASS.trim(),
    },
  });
}

const SUPPORT_EMAIL = 'admin@enfinitty.com';

function getFrom() {
  const user = process.env.SMTP_USER;
  return user ? `Arintu <${user.trim()}>` : `Arintu <noreply@arintu.com>`;
}

async function sendMail({ to, subject, html, text }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[Email disabled — set SMTP env vars to enable]\nTo: ${to}\nSubject: ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({ from: getFrom(), to, subject, html, text });
  } catch (err) {
    console.error('[Email send error]', err.message);
    // Best-effort — don't crash the request
  }
}

const FRONTEND_URL = () => process.env.FRONTEND_URL || 'http://localhost:5173';

// ── Password reset ─────────────────────────────────────────────────────────────
async function sendPasswordReset(email, name, resetUrl) {
  await sendMail({
    to: email,
    subject: 'Reset your Arintu password',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
        <h2 style="color:#3b82f6;margin-bottom:8px">Reset your password</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset your Arintu password. Click the button below — this link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Reset Password</a>
        <p style="color:#888;font-size:13px">If you didn't request this, you can safely ignore this email — your password won't change.</p>
        <p style="color:#888;font-size:12px;word-break:break-all">Link: ${resetUrl}</p>
      </div>`,
    text: `Reset your Arintu password\n\nHi ${name},\n\nUse this link to reset your password (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
  });
}

// ── Account approval ──────────────────────────────────────────────────────────
async function sendAccountApproved(email, name, role) {
  await sendMail({
    to: email,
    subject: 'Your Arintu account has been approved',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
        <h2 style="color:#10b981">Account approved!</h2>
        <p>Hi ${name},</p>
        <p>Your <strong>${role}</strong> account on Arintu has been approved by the super admin. You can now sign in and get started.</p>
        <a href="${FRONTEND_URL()}/login" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#10b981;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Sign In</a>
        <p style="color:#888;font-size:13px">Questions? Contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
      </div>`,
    text: `Hi ${name},\n\nYour ${role} account on Arintu has been approved. Sign in at: ${FRONTEND_URL()}/login\n\nQuestions? Email ${SUPPORT_EMAIL}`,
  });
}

async function sendAccountRejected(email, name, role, notes) {
  await sendMail({
    to: email,
    subject: 'Update on your Arintu account request',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
        <h2 style="color:#ef4444">Account not approved</h2>
        <p>Hi ${name},</p>
        <p>We were unable to approve your <strong>${role}</strong> account on Arintu at this time.</p>
        ${notes ? `<p><strong>Reason:</strong> ${notes}</p>` : ''}
        <p>If you believe this is in error, please contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      </div>`,
    text: `Hi ${name},\n\nYour ${role} account on Arintu was not approved.${notes ? '\n\nReason: ' + notes : ''}\n\nContact us at ${SUPPORT_EMAIL}`,
  });
}

// ── Student ID verification ───────────────────────────────────────────────────
async function sendVerificationApproved(email, name) {
  await sendMail({
    to: email,
    subject: 'Your ID has been verified on Arintu',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
        <h2 style="color:#10b981">ID Verification approved!</h2>
        <p>Hi ${name},</p>
        <p>Your identity document has been verified. You can now apply to classes on Arintu.</p>
        <a href="${FRONTEND_URL()}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#10b981;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Browse Classes</a>
      </div>`,
    text: `Hi ${name},\n\nYour ID has been verified. Browse classes at: ${FRONTEND_URL()}`,
  });
}

async function sendVerificationRejected(email, name, notes) {
  await sendMail({
    to: email,
    subject: 'Arintu ID verification update',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
        <h2 style="color:#ef4444">ID verification not approved</h2>
        <p>Hi ${name},</p>
        <p>We were unable to verify the ID document you submitted.</p>
        ${notes ? `<p><strong>Reason:</strong> ${notes}</p>` : ''}
        <p>Please upload a clear, valid government-issued ID from your dashboard and try again.</p>
        <a href="${FRONTEND_URL()}/app/dashboard" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Go to Dashboard</a>
      </div>`,
    text: `Hi ${name},\n\nYour ID verification was not approved.${notes ? '\n\nReason: ' + notes : ''}\n\nPlease resubmit from your dashboard: ${FRONTEND_URL()}/app/dashboard`,
  });
}

module.exports = {
  sendPasswordReset,
  sendAccountApproved,
  sendAccountRejected,
  sendVerificationApproved,
  sendVerificationRejected,
};
