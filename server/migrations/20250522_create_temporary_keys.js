/**
 * Migration to create temporary_keys table for one-time API keys
 */

exports.up = function(knex) {
  return knex.schema.createTable('temporary_keys', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('key').notNullable().unique();
    table.uuid('envelope_id').notNullable().references('id').inTable('envelopes').onDelete('CASCADE');
    table.uuid('signer_id').nullable().references('id').inTable('signers').onDelete('CASCADE');
    table.boolean('used').defaultTo(false);
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes for faster lookups
    table.index('key');
    table.index('envelope_id');
    table.index('signer_id');
    table.index('expires_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('temporary_keys');
};
