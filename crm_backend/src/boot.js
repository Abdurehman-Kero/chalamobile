// Production start: bring the database up to date, then start the server, all in one process.
//
// A free host puts the server to sleep when idle and runs the start command again on every
// wake-up. Doing the setup here, instead of starting several separate commands, makes each
// wake-up several seconds faster. The seeds only ever fill empty tables (see db/seedGuard.js),
// so running them on every start is safe.
require('dotenv').config();
const knexLib = require('knex');
const config = require('../knexfile');
const { explainDbError } = require('./db/explain');

const env = process.env.NODE_ENV || 'development';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function prepareDatabase() {
  // The database may itself still be waking up, so a few tries before giving up.
  for (let attempt = 1; ; attempt++) {
    const db = knexLib(config[env]);
    try {
      const [, applied] = await db.migrate.latest();
      if (applied.length) console.log(`[boot] applied ${applied.length} migration(s)`);
      await db.seed.run();
      return;
    } catch (err) {
      console.error(`[boot] database setup failed (try ${attempt}/5): ${explainDbError(err)}`);
      if (attempt >= 5) process.exit(1);
      await wait(5000);
    } finally {
      await db.destroy();
    }
  }
}

prepareDatabase().then(() => require('./index'));
