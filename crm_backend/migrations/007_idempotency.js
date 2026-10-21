// Remembers the result of each change the phone sends, keyed by a unique id the
// phone generates. If the phone retries (for example the connection dropped
// before it heard the answer), the stored answer is returned and nothing is
// applied a second time.
exports.up = async (knex) => {
  await knex.schema.createTable('idempotency_keys', t => {
    t.string('key', 120).primary();          // "<user id>:<key from the phone>"
    t.integer('status').notNullable();
    t.jsonb('body');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
  await knex.schema.raw('CREATE INDEX idx_idempotency_created ON idempotency_keys(created_at)');
};

exports.down = async (knex) => { await knex.schema.dropTableIfExists('idempotency_keys'); };
