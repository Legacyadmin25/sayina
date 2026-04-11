/**
 * Migration: seed default pricing plans
 * Inserts the standard plan tiers if they don't already exist.
 * Uses ON CONFLICT DO NOTHING so it's safe to re-run.
 */

exports.up = async function (knex) {
  const plans = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Free',
      description: 'Basic e-signature functionality for individuals and small businesses',
      price: 0,
      currency: 'ZAR',
      billing_cycle: 'monthly',
      envelope_limit: 5,
      sms_credits: 15,
      custom_branding: false,
      remove_watermark: false,
      api_access: false,
      priority_support: false,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Starter',
      description: 'Perfect for small businesses with moderate signing needs',
      price: 15000,
      currency: 'ZAR',
      billing_cycle: 'monthly',
      envelope_limit: 25,
      sms_credits: 75,
      custom_branding: false,
      remove_watermark: true,
      api_access: false,
      priority_support: false,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Basic',
      description: 'Ideal for growing businesses with regular signing requirements',
      price: 35000,
      currency: 'ZAR',
      billing_cycle: 'monthly',
      envelope_limit: 50,
      sms_credits: 150,
      custom_branding: true,
      remove_watermark: true,
      api_access: false,
      priority_support: false,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      name: 'Professional',
      description: 'For businesses with high volume signing needs',
      price: 75000,
      currency: 'ZAR',
      billing_cycle: 'monthly',
      envelope_limit: 200,
      sms_credits: 300,
      custom_branding: true,
      remove_watermark: true,
      api_access: true,
      priority_support: false,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '55555555-5555-5555-5555-555555555555',
      name: 'Enterprise',
      description: 'Complete solution for large organizations with extensive signing requirements',
      price: 200000,
      currency: 'ZAR',
      billing_cycle: 'monthly',
      envelope_limit: 9999,
      sms_credits: 1500,
      custom_branding: true,
      remove_watermark: true,
      api_access: true,
      priority_support: true,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  // Insert each plan — skip if the ID already exists (safe to re-run)
  for (const plan of plans) {
    const exists = await knex('plans').where('id', plan.id).first();
    if (!exists) {
      await knex('plans').insert(plan);
    }
  }
};

exports.down = async function (knex) {
  await knex('plans').whereIn('id', [
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555'
  ]).del();
};
