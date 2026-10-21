require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const path    = require('path');

const app = express();

// ── Middleware ────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: '*' }));  // Lock down to app IP in production
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Offline sync support (occurred-at time + safe retries) ─
const offlineSync = require('./middleware/offlineSync');
app.use('/api', offlineSync);

// ── Static uploads ────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth.routes'));
app.use('/api/products',  require('./routes/products.routes'));
app.use('/api/repairs',   require('./routes/repairs.routes'));
app.use('/api/customers', require('./routes/customers.routes'));
app.use('/api/sales',     require('./routes/sales.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/sync',      require('./routes/sync.routes'));
app.use('/api/users',     require('./routes/users.routes'));
app.use('/api/alerts',    require('./routes/alerts.routes'));
app.use('/api/reports',   require('./routes/reports.routes'));

// ── Health check ──────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'ChalaMob CRM API', time: new Date() }));

// ── 404 handler ───────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global error handler ──────────────────────────────
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed request body', code: 'BAD_JSON' });
  }
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
});

// ── Start ─────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  offlineSync.cleanup();
  console.log(`\n🚀 ChalaMob CRM API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});
