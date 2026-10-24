// Proves that the seeds a deploy runs never touch real data. Needs a Postgres on localhost:54329
// (user postgres, password pw). Usage:  node tests/seed-safety.js "$(pwd)"   (from crm_backend)
const path = process.argv[2];
process.chdir(path);
const { Client } = require(path + '/node_modules/pg');
const { execSync } = require('child_process');
const env = { ...process.env, DATABASE_URL: 'postgres://postgres:pw@localhost:54329/seedtest', NODE_ENV: 'production', JWT_SECRET: 'x' };
const run = (c) => execSync(c, { env, stdio: 'pipe', cwd: path }).toString();
(async () => {
  const a = new Client('postgres://postgres:pw@localhost:54329/postgres'); await a.connect();
  await a.query('DROP DATABASE IF EXISTS seedtest');
  await a.query("CREATE DATABASE seedtest ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C'"); await a.end();
  run('npx knex migrate:latest --knexfile knexfile.js --env production');
  run('npx knex seed:run --knexfile knexfile.js --env production');
  const c = new Client(env.DATABASE_URL); await c.connect();
  // Real activity after the first deploy
  await c.query("UPDATE users SET password='REAL-HASH', name='Real Owner' WHERE role='owner'");
  const p = (await c.query('SELECT id FROM products ORDER BY id LIMIT 1')).rows[0].id;
  const u = (await c.query("SELECT id FROM users WHERE role='owner'")).rows[0].id;
  const s = (await c.query("INSERT INTO sales(payment_method,subtotal,total,created_by) VALUES('cash',100,100,$1) RETURNING id", [u])).rows[0].id;
  await c.query('INSERT INTO sale_items(sale_id,product_id,product_name,qty,unit_price,total) VALUES($1,$2,\'x\',1,100,100)', [s, p]);
  await c.query("INSERT INTO product_images(product_id,url,is_primary) VALUES($1,'https://x/y.jpg',true)", [p]);
  const before = async () => ({
    productIds: (await c.query('SELECT min(id)||\'-\'||max(id) v FROM products')).rows[0].v,
    owner: (await c.query("SELECT name||'/'||password v FROM users WHERE role='owner'")).rows[0].v,
    sales: (await c.query('SELECT count(*)::int v FROM sales')).rows[0].v,
    saleItems: (await c.query('SELECT count(*)::int v FROM sale_items')).rows[0].v,
    images: (await c.query('SELECT count(*)::int v FROM product_images')).rows[0].v,
  });
  const b = await before();
  run('npx knex seed:run --knexfile knexfile.js --env production');   // what every deploy does
  run('npx knex seed:run --knexfile knexfile.js --env production');
  const after = await before();
  console.log('before', JSON.stringify(b)); console.log('after ', JSON.stringify(after));
  console.log(JSON.stringify(b) === JSON.stringify(after) ? 'PASS: deploy seeds changed nothing' : 'FAIL');
  await c.end();
})().catch(e => { console.log('ERR', e.message.slice(0, 300)); process.exit(1); });
