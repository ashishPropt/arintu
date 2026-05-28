require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/schedules', require('./routes/schedules'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/regions', require('./routes/regions'));
app.use('/api/pricing', require('./routes/pricing'));
app.use('/api/mathwave', require('./routes/mathwave'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Arintu API running on port ${PORT}`));
