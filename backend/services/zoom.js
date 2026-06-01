const axios = require('axios');

// Zoom OAuth2 token cache
let zoomToken = null;
let tokenExpiry = null;

async function getZoomToken() {
  if (zoomToken && tokenExpiry && Date.now() < tokenExpiry) return zoomToken;

  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;
  if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    throw new Error('Zoom credentials not configured');
  }

  const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
  const response = await axios.post(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
    {},
    { headers: { Authorization: `Basic ${credentials}` } }
  );

  zoomToken = response.data.access_token;
  tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
  return zoomToken;
}

async function createMeeting({ topic, startTime, duration = 60, agenda = '' }) {
  const token = await getZoomToken();
  const response = await axios.post(
    'https://api.zoom.us/v2/users/me/meetings',
    {
      topic,
      type: 2,
      start_time: startTime,
      duration,
      agenda,
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        waiting_room: true,
        auto_recording: 'cloud',
      },
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return {
    meetingId: String(response.data.id),
    joinUrl: response.data.join_url,
    startUrl: response.data.start_url,
    password: response.data.password,
  };
}

async function deleteMeeting(meetingId) {
  try {
    const token = await getZoomToken();
    await axios.delete(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Non-critical: meeting may already be deleted
  }
}

module.exports = { createMeeting, deleteMeeting };
