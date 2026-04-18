/**
 * Migration: update Starter plan to match the UI
 * - 5 envelopes/month (matches billing page display)
 * - 5 SMS OTP credits/month (one per envelope)
 * - Price stays at R150/month (15000 cents)
 */

exports.up = async function (knex) {
  await knex('plans')
    .where('id', '22222222-2222-2222-2222-222222222222')
    .update({
      envelope_limit: 5,
      sms_credits: 5,
      updated_at: new Date(),
    });
};

exports.down = async function (knex) {
  // Revert to previous migration values
  await knex('plans')
    .where('id', '22222222-2222-2222-2222-222222222222')
    .update({
      envelope_limit: 25,
      sms_credits: 75,
      updated_at: new Date(),
    });
};
