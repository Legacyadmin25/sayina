/**
 * Migration: clean up duplicate active subscriptions per org.
 *
 * Bug: when upgrading plans, old subscriptions were not deactivated.
 * This keeps only the most recently updated active subscription per org
 * and cancels the rest.
 */

exports.up = async function (knex) {
  // Find orgs with multiple active/promo subscriptions
  const dupes = await knex('subscriptions')
    .whereIn('status', ['active', 'promo'])
    .groupBy('org_id')
    .havingRaw('count(*) > 1')
    .select('org_id');

  for (const { org_id } of dupes) {
    // Get the most recently updated subscription for this org
    const keep = await knex('subscriptions')
      .where('org_id', org_id)
      .whereIn('status', ['active', 'promo'])
      .orderBy('updated_at', 'desc')
      .first();

    if (keep) {
      // Cancel all other active subs for this org
      await knex('subscriptions')
        .where('org_id', org_id)
        .whereIn('status', ['active', 'promo'])
        .whereNot('id', keep.id)
        .update({ status: 'cancelled', updated_at: new Date() });
    }
  }
};

exports.down = async function () {
  // Cannot reliably reverse — old subscription statuses are unknown
};
