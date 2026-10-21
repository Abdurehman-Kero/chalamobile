exports.up = async (knex) => {
  await knex.schema.createTable('customers', t => {
    t.increments('id').primary();
    t.string('name', 150).notNullable();
    t.string('phone', 30);
    t.string('address', 300);
    t.boolean('is_vip').defaultTo(false);
    t.decimal('total_spent', 14, 2).defaultTo(0);
    t.integer('buy_count').defaultTo(0);
    t.text('notes');
    t.timestamps(true, true);
  });
  await knex.schema.raw('CREATE INDEX idx_customers_phone ON customers(phone)');
};

exports.down = async (knex) => { await knex.schema.dropTableIfExists('customers'); };
