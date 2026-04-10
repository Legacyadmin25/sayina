/**
 * Migration: promo_codes table
 * Allows admin to generate codes giving customers free plan access for a set period.
 */

exports.up = async function (knex) {
  await knex.schema.createTable('promo_codes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // The code itself — stored uppercase, e.g. "SAYINA2026"
    table.string('code', 50).notNullable().unique();

    // Which plan the code grants access to
    table.uuid('plan_id').notNullable().references('id').inTable('plans').onDelete('RESTRICT');

    // How many days of access the code provides
    table.integer('duration_days').notNullable().defaultTo(30);

    // Maximum number of times this code can be used (null = unlimited)
    table.integer('max_uses').nullable();

    // How many times it has been used
    table.integer('used_count').notNullable().defaultTo(0);

    // Whether the code is still active (admin can deactivate)
    table.boolean('is_active').notNullable().defaultTo(true);

    // Optional expiry date for the code itself (separate from access duration)
    table.timestamp('expires_at').nullable();

    // Admin notes — e.g. "For beta testers", "Sent to John at ABC Corp"
    table.text('notes').nullable();

    // Who created this code
    table.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');

    table.timestamps(true, true);
  });

  // Track which orgs have used which codes (prevents reuse per org)
  await knex.schema.createTable('promo_code_redemptions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('promo_code_id').notNullable().references('id').inTable('promo_codes').onDelete('CASCADE');
    table.uuid('org_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('subscription_id').nullable().references('id').inTable('subscriptions').onDelete('SET NULL');
    table.timestamp('redeemed_at').notNullable().defaultTo(knex.fn.now());

    // One redemption per org per code
    table.unique(['promo_code_id', 'org_id']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('promo_code_redemptions');
  await knex.schema.dropTableIfExists('promo_codes');
};
