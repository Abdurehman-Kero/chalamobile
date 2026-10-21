exports.up = async (knex) => {
  await knex.schema.createTable('sales', t => {
    t.increments('id').primary();
    t.integer('customer_id').references('id').inTable('customers');
    t.string('customer_name', 150);
    t.string('payment_method', 30).notNullable();
    t.decimal('subtotal', 14, 2).notNullable();
    t.decimal('discount', 14, 2).defaultTo(0);
    t.decimal('total', 14, 2).notNullable();
    t.integer('created_by').references('id').inTable('users');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('sale_items', t => {
    t.increments('id').primary();
    t.integer('sale_id').references('id').inTable('sales').onDelete('CASCADE');
    t.integer('product_id').references('id').inTable('products');
    t.string('product_name', 200);
    t.integer('qty').notNullable();
    t.decimal('unit_price', 12, 2).notNullable();
    t.decimal('total', 14, 2).notNullable();
  });

  await knex.schema.raw('CREATE INDEX idx_sales_created_at ON sales(created_at)');
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('sale_items');
  await knex.schema.dropTableIfExists('sales');
};
