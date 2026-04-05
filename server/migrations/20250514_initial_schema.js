/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Users table
    .createTable('users', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('email').notNullable().unique();
      table.string('password').notNullable();
      table.string('first_name').notNullable();
      table.string('last_name').notNullable();
      table.string('phone').nullable();
      table.uuid('org_id').nullable();
      table.enum('role', ['admin', 'org_admin', 'user']).defaultTo('user');
      table.boolean('is_active').defaultTo(true);
      table.boolean('is_email_verified').defaultTo(false);
      table.string('verification_token').nullable();
      table.string('reset_password_token').nullable();
      table.timestamp('reset_password_expires').nullable();
      table.timestamp('last_login').nullable();
      table.timestamps(true, true);
    })

    // Organizations table
    .createTable('organizations', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.string('email').notNullable();
      table.string('phone').nullable();
      table.string('address').nullable();
      table.string('city').nullable();
      table.string('state').nullable();
      table.string('postal_code').nullable();
      table.string('country').defaultTo('South Africa');
      table.string('vat_number').nullable();
      table.string('registration_number').nullable();
      table.string('logo_path').nullable();
      table.string('primary_color').defaultTo('#3B82F6');
      table.string('secondary_color').defaultTo('#1E40AF');
      table.boolean('is_active').defaultTo(true);
      table.integer('sms_credits').defaultTo(0);
      table.timestamps(true, true);
    })

    // Update foreign key in users table
    .raw(`
      ALTER TABLE users
      ADD CONSTRAINT fk_users_organization
      FOREIGN KEY (org_id)
      REFERENCES organizations(id)
      ON DELETE SET NULL
    `)

    // Plans table
    .createTable('plans', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.string('description').nullable();
      table.integer('price').notNullable(); // Price in cents
      table.string('currency').defaultTo('ZAR');
      table.string('billing_cycle').defaultTo('monthly');
      table.integer('envelope_limit').notNullable();
      table.integer('sms_credits').notNullable();
      table.boolean('custom_branding').defaultTo(false);
      table.boolean('remove_watermark').defaultTo(false);
      table.boolean('api_access').defaultTo(false);
      table.boolean('priority_support').defaultTo(false);
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    })

    // Subscriptions table
    .createTable('subscriptions', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('org_id').notNullable();
      table.uuid('plan_id').notNullable();
      table.string('payfast_token').nullable();
      table.string('status').defaultTo('active');
      table.timestamp('start_date').defaultTo(knex.fn.now());
      table.timestamp('end_date').nullable();
      table.timestamp('next_billing_date').nullable();
      table.timestamps(true, true);
      
      table.foreign('org_id').references('id').inTable('organizations').onDelete('CASCADE');
      table.foreign('plan_id').references('id').inTable('plans').onDelete('RESTRICT');
    })

    // Transactions table
    .createTable('transactions', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('org_id').notNullable();
      table.uuid('subscription_id').nullable();
      table.string('payfast_payment_id').nullable();
      table.string('type').notNullable(); // subscription, sms_topup
      table.integer('amount').notNullable(); // Amount in cents
      table.string('currency').defaultTo('ZAR');
      table.string('status').notNullable(); // pending, completed, failed
      table.jsonb('metadata').nullable();
      table.timestamps(true, true);
      
      table.foreign('org_id').references('id').inTable('organizations').onDelete('CASCADE');
      table.foreign('subscription_id').references('id').inTable('subscriptions').onDelete('SET NULL');
    })

    // SMS logs table
    .createTable('sms_logs', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('org_id').notNullable();
      table.uuid('envelope_id').nullable();
      table.integer('count').notNullable().defaultTo(1);
      table.string('action').notNullable(); // envelope_sent, otp_sent
      table.jsonb('metadata').nullable();
      table.timestamps(true, true);
      
      table.foreign('org_id').references('id').inTable('organizations').onDelete('CASCADE');
    })

    // Envelopes table
    .createTable('envelopes', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.text('message').nullable();
      table.integer('expiry_days').defaultTo(30);
      table.enum('status', ['draft', 'sent', 'in_progress', 'completed', 'expired', 'cancelled']).defaultTo('draft');
      table.uuid('org_id').notNullable();
      table.uuid('created_by').notNullable();
      table.timestamp('sent_at').nullable();
      table.timestamp('completed_at').nullable();
      table.timestamps(true, true);
      
      table.foreign('org_id').references('id').inTable('organizations').onDelete('CASCADE');
      table.foreign('created_by').references('id').inTable('users').onDelete('CASCADE');
    })

    // Documents table
    .createTable('documents', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('envelope_id').notNullable();
      table.string('name').notNullable();
      table.string('file_path').notNullable();
      table.string('file_type').notNullable();
      table.integer('file_size').notNullable();
      table.string('sha256_hash').notNullable();
      table.integer('page_count').notNullable();
      table.timestamps(true, true);
      
      table.foreign('envelope_id').references('id').inTable('envelopes').onDelete('CASCADE');
    })

    // Signers table
    .createTable('signers', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('envelope_id').notNullable();
      table.string('email').notNullable();
      table.string('first_name').notNullable();
      table.string('last_name').notNullable();
      table.string('phone').nullable();
      table.integer('order').notNullable().defaultTo(1);
      table.enum('status', ['pending', 'current', 'completed', 'declined', 'cancelled']).defaultTo('pending');
      table.timestamp('completed_at').nullable();
      table.timestamps(true, true);
      
      table.foreign('envelope_id').references('id').inTable('envelopes').onDelete('CASCADE');
      table.unique(['envelope_id', 'email']);
    })

    // Fields table
    .createTable('fields', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('document_id').notNullable();
      table.uuid('signer_id').notNullable();
      table.enum('type', ['signature', 'initial', 'date', 'text', 'checkbox']).notNullable();
      table.integer('page').notNullable();
      table.float('x').notNullable();
      table.float('y').notNullable();
      table.float('width').notNullable();
      table.float('height').notNullable();
      table.boolean('required').defaultTo(true);
      table.text('value').nullable();
      table.timestamp('signed_at').nullable();
      table.timestamps(true, true);
      
      table.foreign('document_id').references('id').inTable('documents').onDelete('CASCADE');
      table.foreign('signer_id').references('id').inTable('signers').onDelete('CASCADE');
    })

    // Events table
    .createTable('events', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('envelope_id').nullable();
      table.uuid('user_id').nullable();
      table.string('action').notNullable();
      table.jsonb('metadata').nullable();
      table.string('ip_address').nullable();
      table.string('user_agent').nullable();
      table.timestamps(true, true);
      
      table.foreign('envelope_id').references('id').inTable('envelopes').onDelete('CASCADE');
      table.foreign('user_id').references('id').inTable('users').onDelete('SET NULL');
    })

    // System logs table
    .createTable('system_logs', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').nullable();
      table.string('action').notNullable();
      table.jsonb('metadata').nullable();
      table.string('ip_address').nullable();
      table.string('user_agent').nullable();
      table.timestamps(true, true);
      
      table.foreign('user_id').references('id').inTable('users').onDelete('SET NULL');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('system_logs')
    .dropTableIfExists('events')
    .dropTableIfExists('fields')
    .dropTableIfExists('signers')
    .dropTableIfExists('documents')
    .dropTableIfExists('envelopes')
    .dropTableIfExists('sms_logs')
    .dropTableIfExists('transactions')
    .dropTableIfExists('subscriptions')
    .dropTableIfExists('plans')
    .raw('ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_organization')
    .dropTableIfExists('organizations')
    .dropTableIfExists('users');
};
