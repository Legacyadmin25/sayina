/**
 * Migration: add role column to signers table
 * Roles: signer (must sign), approver, cc (copy only), viewer (read only)
 */
exports.up = function (knex) {
  return knex.schema.table('signers', (table) => {
    table
      .enum('role', ['signer', 'approver', 'cc', 'viewer'])
      .notNullable()
      .defaultTo('signer')
      .after('phone');
  });
};

exports.down = function (knex) {
  return knex.schema.table('signers', (table) => {
    table.dropColumn('role');
  });
};
