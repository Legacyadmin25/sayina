/**
 * Update Free plan SMS credits from 15 to 5
 * Aligns with "try before you buy" strategy - 5 envelopes + 5 SMS
 */
exports.up = function(knex) {
  return knex('plans')
    .where('id', '11111111-1111-1111-1111-111111111111')
    .update({ sms_credits: 5 })
    .then(() => {
      // Also update existing free-tier orgs to match
      return knex('organizations')
        .whereIn('id', function() {
          this.select('org_id').from('subscriptions')
            .where('plan_id', '11111111-1111-1111-1111-111111111111');
        })
        .where('sms_credits', '>', 5)
        .update({ sms_credits: 5 });
    });
};

exports.down = function(knex) {
  return knex('plans')
    .where('id', '11111111-1111-1111-1111-111111111111')
    .update({ sms_credits: 15 });
};
