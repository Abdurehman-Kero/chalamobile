// The public web store: customer accounts, order requests, notifications, and
// room on product photos for ordering and for the hosted image id.
exports.up = async (knex) => {
  await knex.schema.alterTable('product_images', t => {
    t.integer('sort_order').notNullable().defaultTo(0);
    t.string('public_id', 200);              // the image's id at the image host, used to delete it
  });

  await knex.schema.createTable('shop_accounts', t => {
    t.increments('id').primary();
    t.string('name', 150).notNullable();
    t.string('phone', 30).notNullable().unique();
    t.string('email', 150);
    t.string('password_hash', 100).notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('orders', t => {
    t.increments('id').primary();
    t.string('order_number', 20).notNullable().unique();
    t.integer('account_id').references('id').inTable('shop_accounts');
    t.string('customer_name', 150).notNullable();
    t.string('phone', 30).notNullable();
    t.string('delivery_method', 20).notNullable();      // 'delivery' | 'pickup'
    t.string('address', 300);
    t.string('payment_method', 30).notNullable();       // 'telebirr' | 'cbe' | 'cash'
    t.string('note', 500);
    t.string('status', 20).notNullable().defaultTo('pending'); // pending | confirmed | ready | delivered | cancelled
    t.decimal('total', 14, 2).notNullable();
    t.integer('sale_id').references('id').inTable('sales');    // set when the shop confirms the order
    t.string('client_key', 64);                                 // retry key from the browser: a resend never doubles an order
    t.timestamps(true, true);
  });

  await knex.schema.createTable('order_items', t => {
    t.increments('id').primary();
    t.integer('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE');
    t.integer('product_id').references('id').inTable('products');
    t.string('product_name', 200).notNullable();
    t.integer('qty').notNullable();
    t.decimal('unit_price', 12, 2).notNullable();
  });

  await knex.schema.createTable('notifications', t => {
    t.increments('id').primary();
    t.integer('account_id').notNullable().references('id').inTable('shop_accounts').onDelete('CASCADE');
    t.integer('order_id').references('id').inTable('orders').onDelete('CASCADE');
    t.string('title', 150).notNullable();
    t.string('body', 300);
    t.timestamp('read_at');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.raw('CREATE INDEX idx_orders_account ON orders(account_id, created_at)');
  await knex.schema.raw('CREATE INDEX idx_orders_status ON orders(status)');
  await knex.schema.raw('CREATE UNIQUE INDEX idx_orders_client_key ON orders(account_id, client_key) WHERE client_key IS NOT NULL');
  await knex.schema.raw('CREATE INDEX idx_notifications_account ON notifications(account_id, created_at)');
  await knex.schema.raw('CREATE INDEX idx_sale_items_product ON sale_items(product_id)');
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('order_items');
  await knex.schema.dropTableIfExists('orders');
  await knex.schema.dropTableIfExists('shop_accounts');
  await knex.schema.alterTable('product_images', t => { t.dropColumn('sort_order'); t.dropColumn('public_id'); });
};
