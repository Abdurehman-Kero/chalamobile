// Seeds add demo data. They must NEVER touch real data, because the host may run
// them on every deploy. So by default a seed only fills a table that is empty and
// does nothing otherwise.
//
// A deliberate reset (development only) is:  SEED_RESET=true npm run seed
// which wipes the demo tables first, in an order the foreign keys allow.

const WIPE_ORDER = [
  'idempotency_keys', 'sale_items', 'sales', 'purchases', 'product_images',
  'repairs', 'products', 'customers', 'users',
];

let wiped = false;

async function wipeEverything(knex) {
  if (wiped) return;
  for (const table of WIPE_ORDER) {
    // eslint-disable-next-line no-await-in-loop
    if (await knex.schema.hasTable(table)) await knex(table).del();
  }
  wiped = true;
}

/** True when it is safe to insert demo rows into `table`. */
async function shouldSeed(knex, table) {
  if (process.env.SEED_RESET === 'true') {
    if (process.env.NODE_ENV === 'production' && process.env.SEED_RESET_CONFIRM !== 'yes-wipe-production') {
      console.log(`[seed] ${table}: SEED_RESET is not allowed in production. Skipped.`);
      return false;
    }
    await wipeEverything(knex);
    return true;
  }
  const row = await knex(table).count('* as n').first();
  const empty = Number(row.n) === 0;
  if (!empty) console.log(`[seed] ${table}: already has data, left untouched.`);
  return empty;
}

module.exports = { shouldSeed };
