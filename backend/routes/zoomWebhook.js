/**
 * Zoom Webhook handler
 *
 * POST /api/zoom/webhook
 *
 * Handles two event types:
 *   1. endpoint.url_validation  — Zoom challenge verification (required to activate webhook)
 *   2. recording.completed      — Async: download recording → Vultr Object Storage → notify students
 *
 * Security: HMAC-SHA256 signature verified via x-zm-signature header.
 * Env var: ZOOM_WEBHOOK_SECRET_TOKEN
 *
 * IMPORTANT: This route must be registered with express.raw() BEFORE express.json()
 * so the raw body is available for signature verification.
 */
const express   = require('express');
const crypto    = require('crypto');
const axios     = require('axios');
const db        = require('../database/db');
const storage   = require('../services/objectStorage');
const emailSvc  = require('../services/email');
const zoomSvc   = require('../services/zoom');

const router = express.Router();

// ── Signature verification ─────────────────────────────────────────────────────
function verifySignature(req) {
  const secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;
  if (!secret) {
    console.warn('[Zoom webhook] ZOOM_WEBHOOK_SECRET_TOKEN not set — skipping signature check');
    return true;
  }

  const timestamp  = req.headers['x-zm-request-timestamp'];
  const signature  = req.headers['x-zm-signature'];
  const rawBody    = req.body; // Buffer (express.raw)

  if (!timestamp || !signature) return false;

  const message = `v0:${timestamp}:${rawBody.toString()}`;
  const expected = 'v0=' + crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// ── Main webhook route ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  // Signature check
  if (!verifySignature(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let payload;
  try {
    payload = JSON.parse(req.body.toString());
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { event, payload: data } = payload;

  // ── URL validation challenge (Zoom requires this to activate the webhook) ──
  if (event === 'endpoint.url_validation') {
    const secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;
    if (!secret) return res.status(500).json({ error: 'Webhook secret not configured' });
    const hashForValidate = crypto
      .createHmac('sha256', secret)
      .update(data.plainToken)
      .digest('hex');
    return res.json({ plainToken: data.plainToken, encryptedToken: hashForValidate });
  }

  // ── recording.completed ────────────────────────────────────────────────────
  if (event === 'recording.completed') {
    // Respond immediately — Zoom expects a fast 200; processing is async
    res.status(200).json({ received: true });

    // Fire-and-forget (errors logged, not thrown)
    processRecording(data).catch((err) => {
      console.error('[Zoom webhook] Error processing recording:', err.message || err);
    });
    return;
  }

  // Unknown event — just ack
  res.status(200).json({ received: true });
});

// ── Async recording processor ──────────────────────────────────────────────────
async function processRecording(data) {
  const object     = data?.object;
  const meetingId  = String(object?.id || '');
  const topic      = object?.topic || 'Recording';

  console.log(`[Zoom webhook] recording.completed — meeting ${meetingId} "${topic}"`);

  // Find the schedule row linked to this meeting
  const scheduleRow = await db.query(
    `SELECT cs.id AS schedule_id, cs.class_id, cs.start_time,
            c.name AS class_name
     FROM class_schedules cs
     JOIN classes c ON c.id = cs.class_id
     WHERE cs.zoom_meeting_id = $1`,
    [meetingId]
  );

  if (!scheduleRow.rows[0]) {
    console.warn(`[Zoom webhook] No schedule found for meeting ${meetingId} — skipping`);
    return;
  }

  const { schedule_id, class_id, start_time, class_name } = scheduleRow.rows[0];

  // Find MP4 recording files — prefer shared_screen_with_speaker_view, fallback to any mp4
  const files = object?.recording_files || [];
  const mp4Files = files.filter((f) => f.file_type === 'MP4' && f.status === 'completed');
  if (!mp4Files.length) {
    console.warn(`[Zoom webhook] No completed MP4 files for meeting ${meetingId}`);
    return;
  }

  // Pick the best file
  const targetFile = mp4Files.find((f) => f.recording_type === 'shared_screen_with_speaker_view')
    || mp4Files.find((f) => f.recording_type === 'speaker_view')
    || mp4Files[0];

  const downloadToken = object?.download_token;
  const downloadUrl   = targetFile.download_url + (downloadToken ? `?access_token=${downloadToken}` : '');
  const durationSec   = Math.round((targetFile.file_size || 0) > 0 ? (targetFile.file_size / 400000) : 0); // rough estimate

  // Build storage key — append suffix if key already exists
  const baseKey  = storage.buildStorageKey(class_name, start_time);
  const finalKey = await findFreeKey(baseKey, class_name, start_time);

  console.log(`[Zoom webhook] Downloading + uploading to ${finalKey} …`);
  const { publicUrl, fileSizeBytes } = await storage.uploadFromUrl(downloadUrl, finalKey);
  console.log(`[Zoom webhook] Upload complete — ${publicUrl}`);

  // Save to DB
  const title = `${class_name} — ${new Date(start_time).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  const recordRow = await db.query(
    `INSERT INTO class_recordings
       (class_id, schedule_id, title, storage_key, recording_url,
        file_size_bytes, duration_seconds, recording_type, zoom_meeting_id, recorded_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'zoom', $8, $9)
     RETURNING id`,
    [
      class_id, schedule_id, title, finalKey, publicUrl,
      fileSizeBytes,
      targetFile.duration ? Math.round(targetFile.duration * 60) : null,
      meetingId,
      start_time,
    ]
  );

  console.log(`[Zoom webhook] Recording saved: ${recordRow.rows[0].id}`);

  // Notify enrolled students
  await notifyStudents(class_id, class_name, title, publicUrl);
}

// ── Find a storage key with no collision in the DB ────────────────────────────
async function findFreeKey(baseKey, className, date) {
  const check = await db.query(
    'SELECT id FROM class_recordings WHERE storage_key = $1',
    [baseKey]
  );
  if (!check.rows[0]) return baseKey;

  for (let i = 2; i <= 99; i++) {
    const candidate = storage.buildStorageKey(className, date, i);
    const c2 = await db.query('SELECT id FROM class_recordings WHERE storage_key = $1', [candidate]);
    if (!c2.rows[0]) return candidate;
  }
  // Last resort: add timestamp
  return baseKey.replace('.mp4', `_${Date.now()}.mp4`);
}

// ── Email enrolled students ───────────────────────────────────────────────────
async function notifyStudents(classId, className, title, recordingUrl) {
  const result = await db.query(
    `SELECT u.email, u.name
     FROM enrollments e
     JOIN users u ON u.id = e.student_id
     WHERE e.class_id = $1 AND u.is_active = TRUE`,
    [classId]
  );

  console.log(`[Zoom webhook] Notifying ${result.rows.length} students for class ${classId}`);

  for (const student of result.rows) {
    emailSvc.sendRecordingAvailable({
      toEmail: student.email,
      toName:  student.name,
      className,
      title,
      recordingUrl,
    }).catch((err) => console.error('[Zoom webhook] Email error:', err.message));
  }
}

module.exports = router;
