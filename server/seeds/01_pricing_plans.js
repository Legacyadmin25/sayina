/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('plans').del();
  
  // Insert pricing plans
  await knex('plans').insert([
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Free',
      description: 'Basic e-signature functionality for individuals and small businesses',
      price: 0, // Free
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
      price: 9900, // R99.00
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
      price: 19900, // R199.00
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
      price: 29900, // R299.00
      currency: 'ZAR',
      billing_cycle: 'monthly',
      envelope_limit: 100,
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
      price: 99900, // R999.00
      currency: 'ZAR',
      billing_cycle: 'monthly',
      envelope_limit: 500,
      sms_credits: 1500,
      custom_branding: true,
      remove_watermark: true,
      api_access: true,
      priority_support: true,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '66666666-6666-6666-6666-666666666666',
      name: 'White Label',
      description: 'Fully white-labeled solution with unlimited usage',
      price: 500000, // R5,000.00
      currency: 'ZAR',
      billing_cycle: 'monthly',
      envelope_limit: 9999, // Unlimited (practically)
      sms_credits: 3000,
      custom_branding: true,
      remove_watermark: true,
      api_access: true,
      priority_support: true,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  // Create SMS top-up plans
  await knex('plans').insert([
    {
      id: '77777777-7777-7777-7777-777777777777',
      name: 'SMS Top-up (100 credits)',
      description: '100 SMS credits for OTP verification',
      price: 9900, // R99.00
      currency: 'ZAR',
      billing_cycle: 'once',
      envelope_limit: 0, // Not applicable for SMS top-up
      sms_credits: 100,
      custom_branding: false,
      remove_watermark: false,
      api_access: false,
      priority_support: false,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '88888888-8888-8888-8888-888888888888',
      name: 'SMS Top-up (500 credits)',
      description: '500 SMS credits for OTP verification',
      price: 39900, // R399.00
      currency: 'ZAR',
      billing_cycle: 'once',
      envelope_limit: 0, // Not applicable for SMS top-up
      sms_credits: 500,
      custom_branding: false,
      remove_watermark: false,
      api_access: false,
      priority_support: false,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '99999999-9999-9999-9999-999999999999',
      name: 'SMS Top-up (1000 credits)',
      description: '1000 SMS credits for OTP verification',
      price: 69900, // R699.00
      currency: 'ZAR',
      billing_cycle: 'once',
      envelope_limit: 0, // Not applicable for SMS top-up
      sms_credits: 1000,
      custom_branding: false,
      remove_watermark: false,
      api_access: false,
      priority_support: false,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
};
