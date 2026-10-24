// Password reset codes, and indexes so the lists and the dashboard stay quick as the data grows.
exports.up = async (knex) => {
  await knex.schema.createTable('password_resets', t => {
    t.increments('id').primary();
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('code_hash', 100).notNullable();
    t.timestamp('expires_at', { useTz: true }).notNullable();
    t.integer('attempts').notNullable().defaultTo(0);
    t.timestamp('used_at', { useTz: true });
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(['user_id', 'created_at']);
  });

  const indexes = [
    'sales (created_at)', 'sales (created_by)', 'sale_items (sale_id)', 'sale_items (product_id)',
    'repairs (status)', 'repairs (technician_id)', 'repairs (delivered_at)', 'repairs (promised_date)',
    'purchases (created_at)', 'products (is_active)', 'products (is_published, is_active)',
    'product_images (product_id)', 'orders (status)', 'orders (account_id)', 'order_items (order_id)',
    'notifications (account_id)', 'users ((LOWER(email)))',
  ];
  for (const def of indexes) {
    const name = 'idx_' + def.replace(/[^a-z_]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase();
    // eslint-disable-next-line no-await-in-loop
    await knex.raw(`CREATE INDEX IF NOT EXISTS ${name} ON ${def}`);
  }
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('password_resets');
};
