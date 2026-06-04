require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// ── Stripe webhook must receive the RAW body — register BEFORE express.json() ─
// This route uses express.raw() only for itself; all other routes get JSON parsing below.
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  require('./routes/stripeWebhook')
);

// ── Zoom webhook also needs the raw body for HMAC signature verification ──────
// Must use app.use() (not app.post()) so Express strips the path prefix before
// passing to the router — otherwise router.post('/') never matches.
app.use(
  '/api/zoom/webhook',
  express.raw({ type: 'application/json' }),
  require('./routes/zoomWebhook')
);

app.use(express.json());

// Routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/classes',       require('./routes/classes'));
app.use('/api/schedules',     require('./routes/schedules'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/regions',       require('./routes/regions'));
app.use('/api/pricing',       require('./routes/pricing'));
app.use('/api/mathwave',      require('./routes/mathwave'));
app.use('/api/countries',     require('./routes/countries'));
app.use('/api/applications',  require('./routes/applications'));
app.use('/api/waivers',       require('./routes/waivers'));
app.use('/api/content',       require('./routes/content'));
app.use('/api/payments',      require('./routes/payments'));
app.use('/api/public',        require('./routes/public'));
app.use('/api/verification',  require('./routes/verification'));
app.use('/api/worksheets',    require('./routes/worksheets'));
app.use('/api/family',        require('./routes/family'));
app.use('/api/recordings',    require('./routes/recordings'));
app.use('/api/gallery',       require('./routes/gallery'));
app.use('/api/jobs',          require('./routes/jobs'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Arintu API running on port ${PORT}`));
