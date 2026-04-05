/**
 * Migration to create the usage_notifications table for tracking notification history
 */
exports.up = function(knex) {
  return knex.schema.createTable('usage_notifications', function(table) {
    table.uuid('id').primary().notNullable();
    table.uuid('org_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.enum('resource_type', ['envelope', 'sms']).notNullable();
    table.integer('threshold').notNullable();
    table.integer('usage').notNullable();
    table.integer('limit').notNullable();
    table.integer('percentage').notNullable();
    table.date('billing_period').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Composite index for faster lookups
    table.index(['org_id', 'resource_type', 'threshold', 'billing_period']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('usage_notifications');
};
