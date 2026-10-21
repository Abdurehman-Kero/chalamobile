const jwt = require('jsonwebtoken');
const db = require('../db/knex');

const WRITE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const KEEP_DAYS = 30;
const MAX_AGE_MS = 90 * 86400000;   // a change older than this is not believed
const MAX_FUTURE_MS = 2 * 60000;    // phone clocks may run a little fast

/**
 * Support for phones that work offline and send their changes later.
 *
 *  1. Occurred-at: the phone says when the change really happened
 *     (header X-Occurred-At). Controllers use req.occurredAt for the sale /
 *     received / completed time, so a sale made at 10am offline is reported
 *     under 10am, not under the time it was finally synced.
 *  2. Idempotency: a repeated request with the same Idempotency-Key returns the
 *     first answer instead of running again, so a retry can never double-count
 *     a sale or create a ticket twice.
 */
module.exports = async function offlineSync(req, res, next) {
  const stamp = Date.parse(req.headers['x-occurred-at'] || '');
  const now = Date.now();
  req.occurredAt = Number.isFinite(stamp) && stamp <= now + MAX_FUTURE_MS && stamp >= now - MAX_AGE_MS
    ? new Date(Math.min(stamp, now))
    : new Date(now);

  const rawKey = req.headers['idempotency-key'];
  if (!WRITE.has(req.method) || !rawKey || String(rawKey).length > 64) return next();

  // Scope the key to the signed-in user, so one person's key can never replay another's answer.
  let uid;
  try {
    uid = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET).id;
  } catch {
    return next(); // not signed in; the auth middleware will refuse it
  }
  const key = `${uid}:${rawKey}`;

  try {
    const seen = await db('idempotency_keys').where({ key }).first();
    if (seen) {
      res.setHeader('Idempotent-Replay', 'true');
      return res.status(seen.status).json(seen.body);
    }
  } catch (err) {
    console.error('[offlineSync] lookup failed', err.message);
    return next();
  }

  // Remember successful answers only; a failure is safe to try again.
  const json = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      db('idempotency_keys').insert({ key, status: res.statusCode, body: JSON.stringify(body) })
        .onConflict('key').ignore()
        .catch((e) => console.error('[offlineSync] store failed', e.message));
    }
    return json(body);
  };
  next();
};

// Old keys are no use once the phone has long since synced.
module.exports.cleanup = () =>
  db('idempotency_keys').where('created_at', '<', new Date(Date.now() - KEEP_DAYS * 86400000)).del()
    .catch((e) => console.error('[offlineSync] cleanup failed', e.message));
