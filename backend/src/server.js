const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
if (!process.env.DATABASE_URL && !process.env.DB_PASSWORD) throw new Error('DATABASE_URL or DB_PASSWORD must be configured');

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

// Security: helmet sets HTTP response headers (CSP, HSTS, etc.)
app.use(helmet());

// CORS: env-driven allowed origins (comma separated)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((s) => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '5mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/gates', require('./routes/gates'));
app.use('/api/crews', require('./routes/crews'));
app.use('/api/delays', require('./routes/delays'));
app.use('/api/baggage', require('./routes/baggage'));
app.use('/api/runways', require('./routes/runways'));
app.use('/api/flights', require('./routes/flights'));
app.use('/api/weather', require('./routes/weather'));
app.use('/api/incidents', require('./routes/incidents'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/operational-plans', require('./routes/operationsWorkflow'));

// Map new AI feature routes into the server for clarity
// All new AI endpoints are in routes/ai.js under /api/ai/*

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend build (SPA fallback) when available
const path = require('path');
const fs = require('fs');
const buildDir = path.join(__dirname, '../../frontend/build');
if (fs.existsSync(buildDir)) {
  app.use(express.static(buildDir));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(buildDir, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const status = err.status || 500;
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message });
});

app.listen(PORT, () => {
  console.log(`Airport Operations Backend running on port ${PORT}`);
});

module.exports = app;
