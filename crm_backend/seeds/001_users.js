const bcrypt = require('bcryptjs');

exports.seed = async (knex) => {
  const isPg = knex.client.config.client === 'pg' || knex.client.config.client === 'postgresql' || knex.client.driverName === 'pg';
  if (isPg) {
    await knex.raw('TRUNCATE TABLE users CASCADE');
  } else {
    await knex('users').del();
  }

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
