const bcrypt = require('bcryptjs');
const { shouldSeed } = require('../src/db/seedGuard');

exports.seed = async (knex) => {
  // Demo accounts are only added to an empty table. This runs on every deploy, so it must
  // never wipe real users (and, through them, sales, repairs and orders) or reset passwords.
  if (!(await shouldSeed(knex, 'users'))) return;
  const isPg = knex.client.config.client === 'pg' || knex.client.config.client === 'postgresql' || knex.client.driverName === 'pg';

  const hash = await bcrypt.hash('admin123', 10);
  const users = [
    { name: 'Abdurehman', email: 'admin@chalamobile.com', password: hash, role: 'owner' },
    { name: 'Teklu',      email: 'tech@chalamobile.com',  password: await bcrypt.hash('tech123', 10), role: 'technician' },
    { name: 'Chala',      email: 'sales@chalamobile.com', password: await bcrypt.hash('sales123', 10), role: 'sales' },
  ];

  if (isPg) {
    await knex('users').insert(users).onConflict('email').merge();
  } else {
    await knex('users').insert(users);
  }
};
