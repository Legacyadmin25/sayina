exports.up = function(knex) {
  return knex.schema.alterTable('signers', (table) => {
    table.timestamp('reminder_sent_at').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('signers', (table) => {
    table.dropColumn('reminder_sent_at');
  });
};
