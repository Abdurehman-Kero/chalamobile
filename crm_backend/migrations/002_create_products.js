exports.up = async (knex) => {
  await knex.schema.createTable('products', t => {
    t.increments('id').primary();
    t.string('name', 200).notNullable();
    t.string('brand', 100);
    t.string('category', 100);
    t.string('specs', 200);
    t.integer('storage_gb');
    t.integer('ram_gb');
    t.decimal('selling_price', 12, 2).notNullable();
    t.decimal('cost_price', 12, 2);
    t.integer('stock').notNullable().defaultTo(0);
    t.string('notes', 500);
    t.boolean('is_published').defaultTo(false);
    t.boolean('is_active').defaultTo(true);
    t.string('emoji', 10).defaultTo('📱');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('product_images', t => {
    t.increments('id').primary();
    t.integer('product_id').references('id').inTable('products').onDelete('CASCADE');
    t.string('url', 500).notNullable();
    t.boolean('is_primary').defaultTo(false);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.raw('CREATE INDEX idx_products_category ON products(category)');
  await knex.schema.raw('CREATE INDEX idx_products_is_published ON products(is_published)');
  await knex.schema.raw('CREATE INDEX idx_products_is_active ON products(is_active)');
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('product_images');
  await knex.schema.dropTableIfExists('products');
};
