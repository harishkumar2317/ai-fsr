require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initDB } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(cors({
  origin: isProd
    ? true
    : ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500', 'http://127.0.0.1:3000', 'file://'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests. Please try again later.' }
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Too many login attempts. Please try again later.' }
});
app.use('/api/auth/login', authLimiter);

app.use(express.static(path.join(__dirname, '..', 'website')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/users', require('./routes/users'));
app.use('/api/audits', require('./routes/audits'));
app.use('/api/incidents', require('./routes/incidents'));
app.use('/api/capa', require('./routes/capa'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/invite', require('./routes/invite'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'website', 'index.html'));
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

async function start() {
  try {
    await initDB();
    console.log('Database initialized.');

    app.listen(PORT, () => {
      console.log(`AI-FSR Backend running on http://localhost:${PORT}`);
      console.log(`API: http://localhost:${PORT}/api/health`);
      console.log(`Frontend: http://localhost:${PORT}/`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();