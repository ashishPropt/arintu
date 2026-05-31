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

// ── Shared layout wrapper ──────────────────────────────────────────────────────
function wrap(content) {
  return `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px">
  <div style="background:#fff;border-radius:10px;padding:28px 32px;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
    <div style="margin-bottom:20px">
      <span style="font-size:22px;font-weight:800;color:#2563eb;letter-spacing:-0.5px">Arintu</span>
      <span style="font-size:13px;color:#6b7280;margin-left:8px">Learning Platform</span>
    </div>
    ${content}
    <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0"/>
    <p style="color:#9ca3af;font-size:12px;margin:0">
      Questions? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#2563eb">${SUPPORT_EMAIL}</a>
    </p>
  </div>
</div>`;
}

function btn(url, label, color = '#2563eb') {
  return `<a href="${url}" style="display:inline-block;margin:20px 0;padding:11px 26px;background:${color};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${label}</a>`;
}

// ── Password reset ─────────────────────────────────────────────────────────────
async function sendPasswordReset(email, name, resetUrl) {
  await sendMail({
    to: email,
    subject: 'Reset your Arintu password',
    html: wrap(`
      <h2 style="color:#1e293b;margin:0 0 8px">Reset your password</h2>
      <p>Hi ${name},</p>
      <p>We received a request to reset your Arintu password. Click below — this link expires in <strong>1 hour</strong>.</p>
      ${btn(resetUrl, 'Reset Password')}
      <p style="color:#6b7280;font-size:13px">If you didn't request this, you can safely ignore this email.</p>`),
    text: `Hi ${name},\n\nReset your password (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
  });
}

// ── Account approval ──────────────────────────────────────────────────────────
async function sendAccountApproved(email, name, role) {
  await sendMail({
    to: email,
    subject: 'Your Arintu account has been approved',
    html: wrap(`
      <h2 style="color:#059669;margin:0 0 8px">Account approved! 🎉</h2>
      <p>Hi ${name},</p>
      <p>Your <strong>${role}</strong> account on Arintu has been approved. You can now sign in and get started.</p>
      ${btn(FRONTEND_URL() + '/login', 'Sign In', '#059669')}`),
    text: `Hi ${name},\n\nYour ${role} account on Arintu has been approved.\nSign in at: ${FRONTEND_URL()}/login`,
  });
}

async function sendAccountRejected(email, name, role, notes) {
  await sendMail({
    to: email,
    subject: 'Update on your Arintu account request',
    html: wrap(`
      <h2 style="color:#dc2626;margin:0 0 8px">Account not approved</h2>
      <p>Hi ${name},</p>
      <p>We were unable to approve your <strong>${role}</strong> account at this time.</p>
      ${notes ? `<p><strong>Reason:</strong> ${notes}</p>` : ''}
      <p>If you believe this is in error, please contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>`),
    text: `Hi ${name},\n\nYour ${role} account was not approved.${notes ? '\n\nReason: ' + notes : ''}\n\nContact us at ${SUPPORT_EMAIL}`,
  });
}

// ── Student ID verification ───────────────────────────────────────────────────
async function sendVerificationApproved(email, name) {
  await sendMail({
    to: email,
    subject: 'Your ID has been verified — you can now apply to classes',
    html: wrap(`
      <h2 style="color:#059669;margin:0 0 8px">ID Verified ✓</h2>
      <p>Hi ${name},</p>
      <p>Your identity document has been verified. You can now apply to classes on Arintu.</p>
      ${btn(FRONTEND_URL() + '/app/classes', 'Browse Classes', '#059669')}`),
    text: `Hi ${name},\n\nYour ID has been verified. Browse classes at: ${FRONTEND_URL()}/app/classes`,
  });
}

async function sendVerificationRejected(email, name, notes) {
  await sendMail({
    to: email,
    subject: 'Arintu ID verification — action required',
    html: wrap(`
      <h2 style="color:#dc2626;margin:0 0 8px">ID Verification Not Approved</h2>
      <p>Hi ${name},</p>
      <p>We were unable to verify the ID document you submitted.</p>
      ${notes ? `<p><strong>Reason:</strong> ${notes}</p>` : ''}
      <p>Please upload a clear, valid government-issued ID (passport, national ID, driver's license) from your dashboard.</p>
      ${btn(FRONTEND_URL() + '/app/dashboard', 'Go to Dashboard')}`),
    text: `Hi ${name},\n\nYour ID verification was not approved.${notes ? '\n\nReason: ' + notes : ''}\n\nResubmit from your dashboard: ${FRONTEND_URL()}/app/dashboard`,
  });
}

// ── Application status ─────────────────────────────────────────────────────────
async function sendApplicationApproved(email, name, className) {
  await sendMail({
    to: email,
    subject: `Application approved — ${className}`,
    html: wrap(`
      <h2 style="color:#059669;margin:0 0 8px">Application Approved ✓</h2>
      <p>Hi ${name},</p>
      <p>Your application for <strong>${className}</strong> has been approved. You are now enrolled!</p>
      ${btn(FRONTEND_URL() + '/app/schedules', 'View Your Schedule', '#059669')}`),
    text: `Hi ${name},\n\nYour application for "${className}" has been approved — you're enrolled!\n\nView your schedule: ${FRONTEND_URL()}/app/schedules`,
  });
}

async function sendApplicationRejected(email, name, className, notes) {
  await sendMail({
    to: email,
    subject: `Application update — ${className}`,
    html: wrap(`
      <h2 style="color:#dc2626;margin:0 0 8px">Application Not Approved</h2>
      <p>Hi ${name},</p>
      <p>Your application for <strong>${className}</strong> was not approved at this time.</p>
      ${notes ? `<p><strong>Reason:</strong> ${notes}</p>` : ''}
      <p>If you have questions, please contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>`),
    text: `Hi ${name},\n\nYour application for "${className}" was not approved.${notes ? '\n\nReason: ' + notes : ''}\n\nContact us at ${SUPPORT_EMAIL}`,
  });
}

// ── Fee waiver decisions ───────────────────────────────────────────────────────
async function sendFeeWaiverApproved(email, name) {
  await sendMail({
    to: email,
    subject: 'Your application fee waiver has been approved',
    html: wrap(`
      <h2 style="color:#059669;margin:0 0 8px">Fee Waiver Approved ✓</h2>
      <p>Hi ${name},</p>
      <p>Your application fee waiver has been approved. You can now apply to classes without paying the one-time application fee.</p>
      <p><em>Note: Class tuition fees still apply where applicable.</em></p>
      ${btn(FRONTEND_URL() + '/app/classes', 'Browse Classes', '#059669')}`),
    text: `Hi ${name},\n\nYour application fee waiver has been approved. You can now apply to classes.\n\nNote: Class tuition fees still apply.\n\nBrowse classes: ${FRONTEND_URL()}/app/classes`,
  });
}

async function sendFeeWaiverRejected(email, name, notes) {
  await sendMail({
    to: email,
    subject: 'Update on your application fee waiver request',
    html: wrap(`
      <h2 style="color:#dc2626;margin:0 0 8px">Fee Waiver Not Approved</h2>
      <p>Hi ${name},</p>
      <p>Your application fee waiver request was not approved at this time.</p>
      ${notes ? `<p><strong>Reason:</strong> ${notes}</p>` : ''}
      <p>You can still apply to classes — the standard application fee will apply. Contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> if you have questions.</p>`),
    text: `Hi ${name},\n\nYour fee waiver request was not approved.${notes ? '\n\nReason: ' + notes : ''}\n\nContact us at ${SUPPORT_EMAIL}`,
  });
}

// ── Scholarship decisions ──────────────────────────────────────────────────────
async function sendScholarshipAwarded(email, name, className, type, discountPct) {
  const isFullScholarship = type === 'full_scholarship';
  const subjectLine = isFullScholarship
    ? `Full scholarship awarded — ${className}`
    : `Partial scholarship awarded — ${className}`;
  await sendMail({
    to: email,
    subject: subjectLine,
    html: wrap(`
      <h2 style="color:#059669;margin:0 0 8px">${isFullScholarship ? 'Full Scholarship Awarded 🎓' : 'Partial Scholarship Awarded'}</h2>
      <p>Hi ${name},</p>
      ${isFullScholarship
        ? `<p>Congratulations! You have been awarded a <strong>full scholarship</strong> for <strong>${className}</strong>. You are now enrolled at no cost.</p>`
        : `<p>You have been awarded a <strong>partial scholarship</strong> (${discountPct}% discount) for <strong>${className}</strong>. Your updated class fee has been applied.</p>`
      }
      ${btn(FRONTEND_URL() + '/app/classes', 'Go to My Classes', '#059669')}`),
    text: `Hi ${name},\n\n${isFullScholarship ? 'Full scholarship' : `${discountPct}% partial scholarship`} awarded for "${className}".\n\nView your classes: ${FRONTEND_URL()}/app/classes`,
  });
}

async function sendScholarshipRevoked(email, name, className) {
  await sendMail({
    to: email,
    subject: `Scholarship update — ${className}`,
    html: wrap(`
      <h2 style="color:#d97706;margin:0 0 8px">Scholarship Status Changed</h2>
      <p>Hi ${name},</p>
      <p>Your scholarship for <strong>${className}</strong> has been removed. The standard class tuition fee now applies.</p>
      <p>Please log in to complete your payment and maintain your enrollment.</p>
      ${btn(FRONTEND_URL() + '/app/classes', 'Go to My Classes', '#d97706')}`),
    text: `Hi ${name},\n\nYour scholarship for "${className}" has been removed. Please log in to pay the class fee: ${FRONTEND_URL()}/app/classes`,
  });
}

// ── Class enrollment / schedule ───────────────────────────────────────────────
async function sendEnrolled(email, name, className) {
  await sendMail({
    to: email,
    subject: `You're enrolled in ${className}!`,
    html: wrap(`
      <h2 style="color:#059669;margin:0 0 8px">Enrolled! 🎉</h2>
      <p>Hi ${name},</p>
      <p>You are now enrolled in <strong>${className}</strong>. Check your schedule for upcoming sessions.</p>
      ${btn(FRONTEND_URL() + '/app/schedules', 'View Schedule', '#059669')}`),
    text: `Hi ${name},\n\nYou are now enrolled in "${className}".\n\nView your schedule: ${FRONTEND_URL()}/app/schedules`,
  });
}

async function sendScheduleUpdate(email, name, className, type, newTime, notes) {
  const isCancel = type === 'cancelled';
  await sendMail({
    to: email,
    subject: `Class session ${isCancel ? 'cancelled' : 'rescheduled'} — ${className}`,
    html: wrap(`
      <h2 style="color:${isCancel ? '#dc2626' : '#d97706'};margin:0 0 8px">
        Session ${isCancel ? 'Cancelled' : 'Rescheduled'}
      </h2>
      <p>Hi ${name},</p>
      <p>A session for <strong>${className}</strong> has been ${isCancel ? 'cancelled' : 'rescheduled'}.</p>
      ${newTime ? `<p><strong>New time:</strong> ${newTime}</p>` : ''}
      ${notes ? `<p><strong>Note:</strong> ${notes}</p>` : ''}
      ${btn(FRONTEND_URL() + '/app/schedules', 'View Schedule')}`),
    text: `Hi ${name},\n\nA session for "${className}" has been ${isCancel ? 'cancelled' : 'rescheduled'}.${newTime ? '\n\nNew time: ' + newTime : ''}${notes ? '\n\nNote: ' + notes : ''}\n\nView schedule: ${FRONTEND_URL()}/app/schedules`,
  });
}

// ── 2FA codes ─────────────────────────────────────────────────────────────────
async function send2FACode(email, name, code) {
  await sendMail({
    to: email,
    subject: 'Your Arintu login verification code',
    html: wrap(`
      <h2 style="color:#1e293b;margin:0 0 8px">Login Verification</h2>
      <p>Hi ${name},</p>
      <p>Your one-time login code is:</p>
      <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#2563eb;padding:16px 0;text-align:center">${code}</div>
      <p style="color:#6b7280;font-size:13px">This code expires in <strong>10 minutes</strong>. If you didn't try to sign in, contact us immediately at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>`),
    text: `Hi ${name},\n\nYour Arintu login code is: ${code}\n\nExpires in 10 minutes.`,
  });
}

module.exports = {
  sendPasswordReset,
  sendAccountApproved,
  sendAccountRejected,
  sendVerificationApproved,
  sendVerificationRejected,
  sendApplicationApproved,
  sendApplicationRejected,
  sendFeeWaiverApproved,
  sendFeeWaiverRejected,
  sendScholarshipAwarded,
  sendScholarshipRevoked,
  sendEnrolled,
  sendScheduleUpdate,
  send2FACode,
};
