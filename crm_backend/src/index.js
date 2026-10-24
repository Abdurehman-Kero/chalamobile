require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const compression = require('compression');
const morgan  = require('morgan');
const path    = require('path');

const app = express();

// ── Middleware ────────────────────────────────────────
app.set('trust proxy', 1);       // behind the host's proxy: rate limits need the real client address
// Photos are shown on the web store, which is a different origin from this server.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());   // smaller answers: faster on a phone with a weak connection
app.use(morgan(process.env.NODE_ENV === 'production' ? 'tiny' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// The public web store sets its own, stricter CORS (STOREFRONT_ORIGIN), so it is
// mounted before the staff app's open one.
app.use('/api/public', require('./routes/public.routes'));
app.use(cors({ origin: '*' }));  // Staff app: lock down to the app IP in production

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
app.use('/api/orders',    require('./routes/orders.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/sync',      require('./routes/sync.routes'));
app.use('/api/users',     require('./routes/users.routes'));
app.use('/api/alerts',    require('./routes/alerts.routes'));
app.use('/api/reports',   require('./routes/reports.routes'));

// ── Health check ──────────────────────────────────────
// `commit` shows which version the host is really running (Render sets RENDER_GIT_COMMIT).
app.get('/health', (req, res) => res.json({
  status: 'ok', service: 'ChalaMob CRM API', time: new Date(),
  commit: (process.env.RENDER_GIT_COMMIT || '').slice(0, 7) || undefined,
}));

// ── 404 handler ───────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global error handler ──────────────────────────────
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed request body', code: 'BAD_JSON' });
  }
  // Upload problems (wrong file type, file too large, too many files) are the sender's to fix.
  if (err.name === 'MulterError' || err.status === 400) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Each photo must be 5MB or smaller' : err.message;
    return res.status(400).json({ error: message, code: 'VALIDATION_ERROR' });
  }
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
});

// ── Start ─────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  // Say plainly if the database cannot be reached, instead of a stream of raw connection errors.
  require('./db/knex').raw('select 1')
    .then(() => offlineSync.cleanup())
    .catch((err) => console.error(`\n⚠️  ${require('./db/explain').explainDbError(err)}\n`));
  console.log(`\n🚀 ChalaMob CRM API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});
