const axios = require('axios');
const crypto = require('crypto');
const { db } = require('../config/db');
require('dotenv').config();

/**
 * Generate PayFast signature for payment data
 * @param {object} data - Payment data to sign
 * @returns {string} - Generated signature
 */
const generateSignature = (data) => {
  // Create a string from the data
  const dataString = Object.keys(data)
    .filter(key => key !== 'signature' && data[key] !== '')
    .sort()
    .map(key => `${key}=${encodeURIComponent(data[key]).replace(/%20/g, '+').replace(/[!'()]/g, escape).replace(/\*/g, '%2A')}`)
    .join('&');

  // Add passphrase if set
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  const signatureString = passphrase ? `${dataString}&passphrase=${encodeURIComponent(passphrase)}` : dataString;

  // Generate MD5 hash
  return crypto.createHash('md5').update(signatureString).digest('hex');
};

/**
 * Validate PayFast signature for webhook notifications
 * @param {object} data - Payment data to validate
 * @returns {boolean} - Whether signature is valid
 */
const validateSignature = (data) => {
  const receivedSignature = data.signature;
  const calculatedSignature = generateSignature(data);
  return receivedSignature === calculatedSignature;
};

/**
 * Generate payment URL for one-time payment
 * @param {object} paymentData - Payment details
 * @returns {object} - Payment URL and data
 */
const generateOneTimePaymentUrl = async (paymentData) => {
  try {
    const { amount, itemName, itemDescription, email, firstName, lastName, returnUrl, cancelUrl, notifyUrl, customStr1, customStr2, customStr3 } = paymentData;

    // Set up PayFast API URL
    const payfastUrl = process.env.PAYFAST_SANDBOX === 'true' 
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process';

    // Prepare payment data
    const data = {
      merchant_id: process.env.PAYFAST_MERCHANT_ID,
      merchant_key: process.env.PAYFAST_MERCHANT_KEY,
      return_url: returnUrl || `${process.env.CLIENT_URL}/payment/success`,
      cancel_url: cancelUrl || `${process.env.CLIENT_URL}/payment/cancel`,
      notify_url: notifyUrl || `${process.env.API_URL}/api/v1/webhooks/payfast`,
      name_first: firstName || '',
      name_last: lastName || '',
      email_address: email,
      m_payment_id: customStr1 || '',
      amount: amount.toFixed(2),
      item_name: itemName,
      item_description: itemDescription || '',
      custom_str1: customStr1 || '',
      custom_str2: customStr2 || '',
      custom_str3: customStr3 || '',
    };

    // Generate signature
    data.signature = generateSignature(data);

    return {
      success: true,
      paymentUrl: payfastUrl,
      paymentData: data
    };
  } catch (error) {
    console.error('Error generating payment URL:', error);
    return {
      success: false,
      message: 'Failed to generate payment URL',
      error: error.message
    };
  }
};

/**
 * Generate subscription payment URL
 * @param {object} subscriptionData - Subscription details
 * @returns {object} - Payment URL and data
 */
const generateSubscriptionUrl = async (subscriptionData) => {
  try {
    const { 
      amount, 
      itemName, 
      itemDescription, 
      email, 
      firstName, 
      lastName, 
      returnUrl, 
      cancelUrl, 
      notifyUrl, 
      customStr1, 
      customStr2, 
      customStr3,
      frequency,
      cycles
    } = subscriptionData;

    // Set up PayFast API URL
    const payfastUrl = process.env.PAYFAST_SANDBOX === 'true' 
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process';

    // Prepare subscription data
    const data = {
      merchant_id: process.env.PAYFAST_MERCHANT_ID,
      merchant_key: process.env.PAYFAST_MERCHANT_KEY,
      return_url: returnUrl || `${process.env.CLIENT_URL}/subscription/success`,
      cancel_url: cancelUrl || `${process.env.CLIENT_URL}/subscription/cancel`,
      notify_url: notifyUrl || `${process.env.API_URL}/api/v1/webhooks/payfast`,
      name_first: firstName || '',
      name_last: lastName || '',
      email_address: email,
      m_payment_id: customStr1 || '',
      amount: amount.toFixed(2),
      item_name: itemName,
      item_description: itemDescription || '',
      custom_str1: customStr1 || '',
      custom_str2: customStr2 || '',
      custom_str3: customStr3 || '',
      subscription_type: 1, // 1 for recurring subscription
      billing_date: new Date().toISOString().split('T')[0], // Today's date
      recurring_amount: amount.toFixed(2),
      frequency: frequency || 3, // 3 = Monthly
      cycles: cycles || 0 // 0 = Indefinite
    };

    // Generate signature
    data.signature = generateSignature(data);

    return {
      success: true,
      paymentUrl: payfastUrl,
      paymentData: data
    };
  } catch (error) {
    console.error('Error generating subscription URL:', error);
    return {
      success: false,
      message: 'Failed to generate subscription URL',
      error: error.message
    };
  }
};

/**
 * Fetch subscription details from PayFast
 * @param {string} token - PayFast token
 * @returns {object} - Subscription details
 */
const fetchSubscription = async (token) => {
  try {
    const apiUrl = process.env.PAYFAST_SANDBOX === 'true'
      ? 'https://sandbox.payfast.co.za/subscriptions/api'
      : 'https://api.payfast.co.za/subscriptions/api';

    const response = await axios.get(`${apiUrl}/fetch`, {
      params: { token },
      headers: {
        'merchant-id': process.env.PAYFAST_MERCHANT_ID,
        'version': 'v1',
        'timestamp': Math.floor(Date.now() / 1000),
        'signature': generateSignature({ token })
      }
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error fetching subscription:', error.response?.data || error.message);
    return {
      success: false,
      message: 'Failed to fetch subscription details',
      error: error.response?.data || error.message
    };
  }
};

/**
 * Cancel subscription in PayFast
 * @param {string} token - PayFast token
 * @returns {object} - Cancellation result
 */
const cancelSubscription = async (token) => {
  try {
    const apiUrl = process.env.PAYFAST_SANDBOX === 'true'
      ? 'https://sandbox.payfast.co.za/subscriptions/api'
      : 'https://api.payfast.co.za/subscriptions/api';

    const response = await axios.put(`${apiUrl}/cancel`, 
      { token },
      {
        headers: {
          'merchant-id': process.env.PAYFAST_MERCHANT_ID,
          'version': 'v1',
          'timestamp': Math.floor(Date.now() / 1000),
          'signature': generateSignature({ token })
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error cancelling subscription:', error.response?.data || error.message);
    return {
      success: false,
      message: 'Failed to cancel subscription',
      error: error.response?.data || error.message
    };
  }
};

/**
 * Process PayFast payment notification (ITN)
 * @param {object} data - Payment notification data
 * @returns {object} - Processing result
 */
const processPaymentNotification = async (data) => {
  try {
    // Validate signature
    if (!validateSignature(data)) {
      return {
        success: false,
        message: 'Invalid signature'
      };
    }

    // Extract payment data
    const {
      payment_status,
      m_payment_id,
      pf_payment_id,
      item_name,
      amount_gross,
      amount_fee,
      amount_net,
      custom_str1,
      custom_str2,
      custom_str3,
      token
    } = data;

    // Determine payment type from custom_str2
    const paymentType = custom_str2 || 'unknown';
    
    // Get organization ID from custom_str1
    const orgId = custom_str1;
    
    if (!orgId) {
      return {
        success: false,
        message: 'Missing organization ID'
      };
    }

    // Check if organization exists
    const organization = await db('organizations')
      .where({ id: orgId })
      .first();

    if (!organization) {
      return {
        success: false,
        message: 'Organization not found'
      };
    }

    // Process based on payment type
    if (paymentType === 'subscription') {
      // Handle subscription payment
      if (payment_status === 'COMPLETE') {
        // Get plan ID from custom_str3
        const planId = custom_str3;
        
        if (!planId) {
          return {
            success: false,
            message: 'Missing plan ID'
          };
        }

        // Check if plan exists
        const plan = await db('plans')
          .where({ id: planId })
          .first();

        if (!plan) {
          return {
            success: false,
            message: 'Plan not found'
          };
        }

        // Check if subscription already exists
        const existingSubscription = await db('subscriptions')
          .where({ org_id: orgId, plan_id: planId })
          .first();

        // Deactivate any other active subscriptions for this org (handles upgrades/downgrades)
        await db('subscriptions')
          .where('org_id', orgId)
          .whereNot('plan_id', planId)
          .where('status', 'active')
          .update({ status: 'cancelled', updated_at: db.fn.now() });

        if (existingSubscription) {
          // Update existing subscription
          await db('subscriptions')
            .where({ id: existingSubscription.id })
            .update({
              payfast_token: token,
              status: 'active',
              start_date: db.fn.now(),
              next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
              updated_at: db.fn.now()
            });
        } else {
          // Create new subscription
          await db('subscriptions').insert({
            org_id: orgId,
            plan_id: planId,
            payfast_token: token,
            status: 'active',
            start_date: db.fn.now(),
            next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          });
        }

        // Record transaction
        await db('transactions').insert({
          org_id: orgId,
          subscription_id: existingSubscription?.id,
          payfast_payment_id: pf_payment_id,
          type: 'subscription',
          amount: parseFloat(amount_gross) * 100, // Convert to cents
          currency: 'ZAR',
          status: 'completed',
          metadata: JSON.stringify({
            payment_id: m_payment_id,
            payfast_payment_id: pf_payment_id,
            plan_id: planId,
            plan_name: plan.name,
            amount_gross,
            amount_fee,
            amount_net,
            token
          })
        });

        // Log system event
        await db('system_logs').insert({
          action: 'subscription_payment_received',
          metadata: JSON.stringify({
            org_id: orgId,
            plan_id: planId,
            plan_name: plan.name,
            amount: amount_gross,
            payment_id: pf_payment_id
          })
        });

        return {
          success: true,
          message: 'Subscription payment processed successfully'
        };
      }
    } else if (paymentType === 'sms_topup') {
      // Handle SMS top-up payment
      if (payment_status === 'COMPLETE') {
        // Get SMS plan ID from custom_str3
        const smsPlanId = custom_str3;
        
        if (!smsPlanId) {
          return {
            success: false,
            message: 'Missing SMS plan ID'
          };
        }

        // Check if SMS plan exists
        const smsPlan = await db('plans')
          .where({ id: smsPlanId })
          .first();

        if (!smsPlan) {
          return {
            success: false,
            message: 'SMS plan not found'
          };
        }

        // Add SMS credits to organization
        await db('organizations')
          .where({ id: orgId })
          .increment('sms_credits', smsPlan.sms_credits);

        // Record transaction
        await db('transactions').insert({
          org_id: orgId,
          payfast_payment_id: pf_payment_id,
          type: 'sms_topup',
          amount: parseFloat(amount_gross) * 100, // Convert to cents
          currency: 'ZAR',
          status: 'completed',
          metadata: JSON.stringify({
            payment_id: m_payment_id,
            payfast_payment_id: pf_payment_id,
            sms_plan_id: smsPlanId,
            sms_plan_name: smsPlan.name,
            sms_credits: smsPlan.sms_credits,
            amount_gross,
            amount_fee,
            amount_net
          })
        });

        // Log system event
        await db('system_logs').insert({
          action: 'sms_topup_payment_received',
          metadata: JSON.stringify({
            org_id: orgId,
            sms_plan_id: smsPlanId,
            sms_plan_name: smsPlan.name,
            sms_credits: smsPlan.sms_credits,
            amount: amount_gross,
            payment_id: pf_payment_id
          })
        });

        return {
          success: true,
          message: 'SMS top-up payment processed successfully'
        };
      }
    }

    // Default response for other payment types or statuses
    return {
      success: true,
      message: `Payment notification received with status: ${payment_status}`
    };
  } catch (error) {
    console.error('Error processing payment notification:', error);
    return {
      success: false,
      message: 'Failed to process payment notification',
      error: error.message
    };
  }
};

module.exports = {
  generateSignature,
  validateSignature,
  generateOneTimePaymentUrl,
  generateSubscriptionUrl,
  fetchSubscription,
  cancelSubscription,
  processPaymentNotification
};
