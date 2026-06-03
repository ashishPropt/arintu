/**
 * Vultr Object Storage service (S3-compatible).
 *
 * Required env vars:
 *   VULTR_OS_ACCESS_KEY      — Vultr Object Storage access key
 *   VULTR_OS_SECRET_KEY      — Vultr Object Storage secret key
 *   VULTR_OS_ENDPOINT        — e.g. https://ewr1.vultrobjects.com
 *   VULTR_OS_BUCKET          — bucket name, e.g. arintu-recordings
 *   VULTR_OS_PUBLIC_BASE_URL — public CDN/bucket base URL (no trailing slash)
 *                              e.g. https://arintu-recordings.ewr1.vultrobjects.com
 */
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const https = require('https');
const http  = require('http');

const {
  S3Client,
  PutObjectCommand,
} = require('@aws-sdk/client-s3');

function getClient() {
  const { VULTR_OS_ACCESS_KEY, VULTR_OS_SECRET_KEY, VULTR_OS_ENDPOINT } = process.env;
  if (!VULTR_OS_ACCESS_KEY || !VULTR_OS_SECRET_KEY || !VULTR_OS_ENDPOINT) {
    throw new Error('Vultr Object Storage credentials not configured');
  }
  return new S3Client({
    endpoint: VULTR_OS_ENDPOINT,
    region:   'us-east-1',          // Vultr ignores region but SDK requires one
    credentials: {
      accessKeyId:     VULTR_OS_ACCESS_KEY,
      secretAccessKey: VULTR_OS_SECRET_KEY,
    },
    forcePathStyle: false,          // Vultr uses virtual-hosted-style URLs
  });
}

/**
 * Downloads a URL to a temp file, then streams that file to Vultr Object Storage.
 *
 * @param {string} downloadUrl   - Authenticated download URL (e.g. from Zoom)
 * @param {string} storageKey    - S3 object key, e.g. recordings/class-name/class-name_2025-01-15.mp4
 * @param {string} contentType   - MIME type, default 'video/mp4'
 * @returns {Promise<string>}      Public URL of the uploaded file
 */
async function uploadFromUrl(downloadUrl, storageKey, contentType = 'video/mp4') {
  const { VULTR_OS_BUCKET, VULTR_OS_PUBLIC_BASE_URL } = process.env;
  if (!VULTR_OS_BUCKET || !VULTR_OS_PUBLIC_BASE_URL) {
    throw new Error('VULTR_OS_BUCKET or VULTR_OS_PUBLIC_BASE_URL not configured');
  }

  // Step 1: Download to a temp file
  const tmpFile = path.join(os.tmpdir(), `arintu_rec_${Date.now()}.mp4`);
  await downloadToFile(downloadUrl, tmpFile);

  try {
    // Step 2: Upload to Vultr Object Storage
    // Read into Buffer — avoids AWS SDK v3 streaming compatibility issues with Vultr.
    // Zoom recordings for 90-min sessions are typically 200–400 MB; well within VPS limits.
    const client = getClient();
    const fileBuffer = fs.readFileSync(tmpFile);

    await client.send(new PutObjectCommand({
      Bucket:        VULTR_OS_BUCKET,
      Key:           storageKey,
      Body:          fileBuffer,
      ContentType:   contentType,
      ContentLength: fileBuffer.length,
    }));

    const publicUrl = `${VULTR_OS_PUBLIC_BASE_URL.replace(/\/$/, '')}/${storageKey}`;
    return { publicUrl, fileSizeBytes: fileBuffer.length };
  } finally {
    // Always clean up the temp file
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

/**
 * Downloads a URL to a local file path, following redirects.
 */
function downloadToFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    let redirects = 0;

    function doGet(targetUrl) {
      if (redirects > 10) return reject(new Error('Too many redirects'));
      const proto = targetUrl.startsWith('https') ? https : http;
      proto.get(targetUrl, (res) => {
        // Follow redirects (Zoom uses signed S3 URLs with redirect chains)
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
          const location = res.headers.location;
          if (!location) return reject(new Error('Redirect without location header'));
          res.resume();
          redirects++;
          doGet(location);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`Download failed: HTTP ${res.statusCode} from ${targetUrl}`));
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
        file.on('error', reject);
      }).on('error', reject);
    }

    doGet(url);
  });
}

/**
 * Builds a safe storage key for a recording.
 * Format: recordings/{safe_class_name}/{safe_class_name}_{YYYY-MM-DD}.mp4
 * If there's already a file for that date, appends _N (e.g. _2).
 *
 * @param {string} className    - Raw class name from DB
 * @param {Date|string} date    - Recording date
 * @param {number} [suffix]     - Optional numeric suffix to avoid collisions
 */
function buildStorageKey(className, date, suffix = 0) {
  const safeClass = className
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  const d = new Date(date);
  const dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD

  const filename = suffix > 0
    ? `${safeClass}_${dateStr}_${suffix}.mp4`
    : `${safeClass}_${dateStr}.mp4`;

  return `recordings/${safeClass}/${filename}`;
}

module.exports = { uploadFromUrl, buildStorageKey };
