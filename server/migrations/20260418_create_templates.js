/**
 * Create templates table for document templates
 */
exports.up = function(knex) {
  return knex.schema.createTable('templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('name').notNullable();
    table.text('description');
    table.string('category').defaultTo('general');
    table.string('file_name').notNullable();
    table.string('file_path').notNullable();
    table.integer('file_size').defaultTo(0);
    table.string('file_type').defaultTo('application/pdf');
    table.boolean('is_public').defaultTo(false);
    table.uuid('org_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('templates');
};
