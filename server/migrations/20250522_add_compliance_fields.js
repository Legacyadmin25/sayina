/**
 * Migration to add compliance fields to signature_events and audit_trail tables
 */

exports.up = function(knex) {
  return Promise.all([
    // Add compliance fields to signature_events table
    knex.schema.hasTable('signature_events').then(exists => {
      if (exists) {
        return knex.schema.alterTable('signature_events', table => {
          table.timestamp('compliance_given_at').nullable();
          table.text('compliance_via').nullable();
          table.jsonb('compliance_metadata').nullable();
        });
      }
    }),
    
    // Add compliance fields to audit_trail table (if it exists)
    knex.schema.hasTable('audit_trail').then(exists => {
      if (exists) {
        return knex.schema.alterTable('audit_trail', table => {
          table.timestamp('compliance_given_at').nullable();
          table.text('compliance_via').nullable();
          table.boolean('compliance_given').nullable();
        });
      }
    }),
    
    // Add compliance fields to signers table
    knex.schema.alterTable('signers', table => {
      table.timestamp('compliance_given_at').nullable();
      table.text('compliance_via').nullable();
      table.boolean('compliance_given').defaultTo(false);
      table.jsonb('compliance_metadata').nullable();
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    // Remove compliance fields from signature_events table
    knex.schema.hasTable('signature_events').then(exists => {
      if (exists) {
        return knex.schema.alterTable('signature_events', table => {
          table.dropColumn('compliance_given_at');
          table.dropColumn('compliance_via');
          table.dropColumn('compliance_metadata');
        });
      }
    }),
    
    // Remove compliance fields from audit_trail table (if it exists)
    knex.schema.hasTable('audit_trail').then(exists => {
      if (exists) {
        return knex.schema.alterTable('audit_trail', table => {
          table.dropColumn('compliance_given_at');
          table.dropColumn('compliance_via');
          table.dropColumn('compliance_given');
        });
      }
    }),
    
    // Remove compliance fields from signers table
    knex.schema.alterTable('signers', table => {
      table.dropColumn('compliance_given_at');
      table.dropColumn('compliance_via');
      table.dropColumn('compliance_given');
      table.dropColumn('compliance_metadata');
    })
  ]);
};
