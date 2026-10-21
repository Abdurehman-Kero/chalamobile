// Adds what the owner reports and reminders need:
//  - sale_items.cost_price: the cost at the moment of sale, so profit stays
//    correct even if a product's cost price changes later
//  - repairs.promised_date / parts_cost: when the device was promised back,
//    and what the parts cost (for repair profit)
//  - purchases: stock bought (restocks), listed in the daily report
exports.up = async (knex) => {
  await knex.schema.alterTable('sale_items', t => {
    t.decimal('cost_price', 12, 2);
  });
  await knex.raw(`
    UPDATE sale_items SET cost_price = p.cost_price
    FROM products p WHERE sale_items.product_id = p.id`);

  await knex.schema.alterTable('repairs', t => {
    t.date('promised_date');
    t.decimal('parts_cost', 12, 2);
  });

  await knex.schema.createTable('purchases', t => {
    t.increments('id').primary();
    t.integer('product_id').references('id').inTable('products');
    t.string('product_name', 200).notNullable();
    t.integer('qty').notNullable();
    t.decimal('unit_cost', 12, 2).notNullable().defaultTo(0);
    t.decimal('total', 14, 2).notNullable().defaultTo(0);
    t.string('supplier', 150);
    t.integer('created_by').references('id').inTable('users');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
  await knex.schema.raw('CREATE INDEX idx_purchases_created_at ON purchases(created_at)');
  await knex.schema.raw('CREATE INDEX idx_repairs_promised ON repairs(promised_date)');
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('purchases');
  await knex.schema.alterTable('repairs', t => { t.dropColumn('promised_date'); t.dropColumn('parts_cost'); });
  await knex.schema.alterTable('sale_items', t => { t.dropColumn('cost_price'); });
};
