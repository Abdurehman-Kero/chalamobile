exports.up = async (knex) => {
  await knex.schema.createTable('repairs', t => {
    t.increments('id').primary();
    t.string('ticket_number', 20).unique().notNullable();
    t.string('device_name', 200).notNullable();
    t.text('issue').notNullable();
    t.integer('customer_id').references('id').inTable('customers');
    t.string('customer_name', 150);
    t.string('customer_phone', 30);
    t.string('status', 30).notNullable().defaultTo('received');
    t.integer('status_step').notNullable().defaultTo(1);
    t.decimal('estimated_cost', 12, 2);
    t.decimal('actual_cost', 12, 2);
    t.text('parts_used');
    t.integer('technician_id').references('id').inTable('users');
    t.boolean('is_overdue').defaultTo(false);
    t.timestamp('received_at').defaultTo(knex.fn.now());
    t.timestamp('completed_at');
    t.timestamp('delivered_at');
    t.timestamps(true, true);
  });
  await knex.schema.raw('CREATE INDEX idx_repairs_status ON repairs(status)');
};

exports.down = async (knex) => { await knex.schema.dropTableIfExists('repairs'); };
