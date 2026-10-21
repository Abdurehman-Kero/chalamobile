exports.up = async (knex) => {
  await knex.schema.createTable('users', t => {
    t.increments('id').primary();
    t.string('name', 100).notNullable();
    t.string('email', 150).unique().notNullable();
    t.string('password', 255).notNullable();
    t.string('role', 20).notNullable().defaultTo('sales');
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });
};

exports.down = async (knex) => { await knex.schema.dropTableIfExists('users'); };
