const { ApiError } = require('../middleware/errorMiddleware');
const { db } = require('../config/db');
const { logPaymentEvent } = require('../services/loggerService');
const { generatePaymentUrl, generateSubscriptionUrl } = require('./payfastHelper');

/**
 * Get all subscription plans
 * @returns {Promise<Array>} - Array of subscription plans
 */
const getSubscriptionPlans = async () => {
  try {
    const plans = await db('plans')
      .where('is_active', true)
      .orderBy('price', 'asc');
    
    return plans;
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    throw new ApiError(500, 'Failed to fetch subscription plans');
  }
};

/**
 * Get subscription plan by ID
 * @param {string} planId - Plan ID
 * @returns {Promise<Object>} - Subscription plan
 */
const getSubscriptionPlanById = async (planId) => {
  try {
    const plan = await db('plans')
      .where('id', planId)
      .where('is_active', true)
      .first();
    
    if (!plan) {
      throw new ApiError(404, 'Subscription plan not found');
    }
    
    return plan;
  } catch (error) {
    console.error('Error fetching subscription plan:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to fetch subscription plan');
  }
};

/**
 * Get organization's current subscription
 * @param {string} orgId - Organization ID
 * @returns {Promise<Object>} - Current subscription
 */
const getCurrentSubscription = async (orgId) => {
  try {
    const subscription = await db('subscriptions')
      .where('org_id', orgId)
      .where('status', 'active')
      .orderBy('created_at', 'desc')
      .first();
    
    if (!subscription) {
      return null;
    }
    
    // Get plan details
    const plan = await db('plans')
      .where('id', subscription.plan_id)
      .first();
    
    return {
      ...subscription,
      plan
    };
  } catch (error) {
    console.error('Error fetching current subscription:', error);
    throw new ApiError(500, 'Failed to fetch current subscription');
  }
};

/**
 * Create a subscription for an organization
 * @param {string} orgId - Organization ID
 * @param {string} planId - Plan ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Subscription details
 */
const createSubscription = async (orgId, planId, userId) => {
  try {
    // Get plan details
    const plan = await getSubscriptionPlanById(planId);
    
    // Get organization details
    const organization = await db('organizations')
      .where('id', orgId)
      .first();
    
    if (!organization) {
      throw new ApiError(404, 'Organization not found');
    }
    
    // Get user details
    const user = await db('users')
      .where('id', userId)
      .first();
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    // Check if organization already has an active subscription
    const currentSubscription = await getCurrentSubscription(orgId);
    
    if (currentSubscription) {
      throw new ApiError(400, 'Organization already has an active subscription');
    }
    
    // Generate merchant payment ID
    const merchantPaymentId = `SUB_${orgId}_${Date.now()}`;
    
    // Create subscription in database (pending status)
    const [subscriptionId] = await db('subscriptions').insert({
      org_id: orgId,
      plan_id: planId,
      user_id: userId,
      merchant_payment_id: merchantPaymentId,
      amount: plan.price,
      status: 'pending',
      features: JSON.stringify(plan.features)
    }).returning('id');
    
    // Create subscription payment URL
    const subscriptionData = {
      returnUrl: `${process.env.CLIENT_URL}/billing/success?subscription_id=${subscriptionId}`,
      cancelUrl: `${process.env.CLIENT_URL}/billing/cancel?subscription_id=${subscriptionId}`,
      notifyUrl: `${process.env.API_URL}/api/webhooks/payfast`,
      merchantPaymentId,
      amount: plan.price / 100, // Convert cents to rand
      itemName: `Sayina ${plan.name} Plan`,
      itemDescription: `Monthly subscription to Sayina ${plan.name} Plan`,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      customStr1: subscriptionId,
      customStr2: orgId,
      customStr3: planId,
      customInt1: plan.price,
      emailConfirmation: true,
      confirmationAddress: organization.email || user.email,
      frequency: 3, // Monthly
      cycles: 0 // Indefinite
    };
    
    const result = await generateSubscriptionUrl(subscriptionData);
    
    if (!result || !result.includes('payfast.co.za')) {
      throw new ApiError(500, 'Failed to generate subscription payment URL');
    }
    
    // Log payment event
    await logPaymentEvent({
      org_id: orgId,
      user_id: userId,
      amount: plan.price,
      currency: 'ZAR',
      payment_method: 'payfast',
      payment_type: 'subscription',
      status: 'pending',
      metadata: {
        subscription_id: subscriptionId,
        plan_id: planId,
        plan_name: plan.name,
        merchant_payment_id: merchantPaymentId
      }
    });
    
    return {
      subscription_id: subscriptionId,
      payment_url: result,
      plan
    };
  } catch (error) {
    console.error('Error creating subscription:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to create subscription');
  }
};

/**
 * Cancel a subscription
 * @param {string} subscriptionId - Subscription ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Cancellation result
 */
const cancelSubscription = async (subscriptionId, userId) => {
  try {
    // Get subscription details
    const subscription = await db('subscriptions')
      .where('id', subscriptionId)
      .first();
    
    if (!subscription) {
      throw new ApiError(404, 'Subscription not found');
    }
    
    // Check if subscription is already cancelled
    if (subscription.status === 'cancelled') {
      throw new ApiError(400, 'Subscription is already cancelled');
    }
    
    // Check if subscription is active
    if (subscription.status !== 'active') {
      throw new ApiError(400, 'Only active subscriptions can be cancelled');
    }
    
    // Update subscription status
    await db('subscriptions')
      .where('id', subscriptionId)
      .update({
        status: 'cancelled',
        cancelled_at: new Date(),
        cancelled_by: userId
      });
    
    // Log payment event
    await logPaymentEvent({
      org_id: subscription.org_id,
      user_id: userId,
      amount: 0,
      currency: 'ZAR',
      payment_method: 'payfast',
      payment_type: 'subscription_cancellation',
      status: 'completed',
      metadata: {
        subscription_id: subscriptionId,
        plan_id: subscription.plan_id,
        token: subscription.token
      }
    });
    
    return {
      success: true,
      message: 'Subscription cancelled successfully'
    };
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to cancel subscription');
  }
};

/**
 * Change subscription plan
 * @param {string} orgId - Organization ID
 * @param {string} planId - New plan ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Plan change result
 */
const changeSubscriptionPlan = async (orgId, planId, userId) => {
  try {
    // Get current subscription
    const currentSubscription = await getCurrentSubscription(orgId);
    
    if (!currentSubscription) {
      throw new ApiError(404, 'No active subscription found');
    }
    
    // Get new plan details
    const newPlan = await getSubscriptionPlanById(planId);
    
    // Check if new plan is the same as current plan
    if (currentSubscription.plan_id === planId) {
      throw new ApiError(400, 'Organization is already on this plan');
    }
    
    // Cancel current subscription
    await cancelSubscription(currentSubscription.id, userId);
    
    // Create new subscription
    const result = await createSubscription(orgId, planId, userId);
    
    return result;
  } catch (error) {
    console.error('Error changing subscription plan:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to change subscription plan');
  }
};

/**
 * Check if organization has sufficient envelope quota
 * @param {string} orgId - Organization ID
 * @returns {Promise<boolean>} - True if quota is sufficient
 */
const checkEnvelopeQuota = async (orgId) => {
  try {
    // Get current subscription
    const subscription = await getCurrentSubscription(orgId);
    
    if (!subscription) {
      throw new ApiError(403, 'Organization does not have an active subscription');
    }
    
    // Get plan details
    const plan = subscription.plan;
    
    // Get current month's envelope count
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    const envelopeCount = await db('envelopes')
      .where('org_id', orgId)
      .where('created_at', '>=', firstDayOfMonth)
      .count('id as count')
      .first();
    
    // Check if quota is exceeded
    if (envelopeCount.count >= plan.monthly_envelopes) {
      return {
        sufficient: false,
        used: envelopeCount.count,
        limit: plan.monthly_envelopes
      };
    }
    
    return {
      sufficient: true,
      used: envelopeCount.count,
      limit: plan.monthly_envelopes
    };
  } catch (error) {
    console.error('Error checking envelope quota:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to check envelope quota');
  }
};

/**
 * Check if organization has sufficient document quota
 * @param {string} orgId - Organization ID
 * @returns {Promise<boolean>} - True if quota is sufficient
 */
const checkDocumentQuota = async (orgId) => {
  try {
    // Get current subscription
    const subscription = await getCurrentSubscription(orgId);
    
    if (!subscription) {
      throw new ApiError(403, 'Organization does not have an active subscription');
    }
    
    // Get plan details
    const plan = subscription.plan;
    
    // Get total document count
    const documentCount = await db('documents')
      .where('org_id', orgId)
      .count('id as count')
      .first();
    
    // Check if quota is exceeded
    if (documentCount.count >= plan.max_documents) {
      return {
        sufficient: false,
        used: documentCount.count,
        limit: plan.max_documents
      };
    }
    
    return {
      sufficient: true,
      used: documentCount.count,
      limit: plan.max_documents
    };
  } catch (error) {
    console.error('Error checking document quota:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to check document quota');
  }
};

/**
 * Check if organization has sufficient user quota
 * @param {string} orgId - Organization ID
 * @returns {Promise<boolean>} - True if quota is sufficient
 */
const checkUserQuota = async (orgId) => {
  try {
    // Get current subscription
    const subscription = await getCurrentSubscription(orgId);
    
    if (!subscription) {
      throw new ApiError(403, 'Organization does not have an active subscription');
    }
    
    // Get plan details
    const plan = subscription.plan;
    
    // Get user count
    const userCount = await db('users')
      .where('org_id', orgId)
      .count('id as count')
      .first();
    
    // Check if quota is exceeded
    if (userCount.count >= plan.max_users) {
      return {
        sufficient: false,
        used: userCount.count,
        limit: plan.max_users
      };
    }
    
    return {
      sufficient: true,
      used: userCount.count,
      limit: plan.max_users
    };
  } catch (error) {
    console.error('Error checking user quota:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to check user quota');
  }
};

/**
 * Check if organization has sufficient SMS credits
 * @param {string} orgId - Organization ID
 * @param {number} requiredCredits - Required SMS credits
 * @returns {Promise<boolean>} - True if credits are sufficient
 */
const checkSmsCredits = async (orgId, requiredCredits = 1) => {
  try {
    // Get organization details
    const organization = await db('organizations')
      .where('id', orgId)
      .select('sms_credits')
      .first();
    
    if (!organization) {
      throw new ApiError(404, 'Organization not found');
    }
    
    // Check if credits are sufficient
    if (organization.sms_credits < requiredCredits) {
      return {
        sufficient: false,
        available: organization.sms_credits,
        required: requiredCredits
      };
    }
    
    return {
      sufficient: true,
      available: organization.sms_credits,
      required: requiredCredits
    };
  } catch (error) {
    console.error('Error checking SMS credits:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to check SMS credits');
  }
};

/**
 * Deduct SMS credits from organization
 * @param {string} orgId - Organization ID
 * @param {number} credits - Credits to deduct
 * @returns {Promise<Object>} - Updated SMS credits
 */
const deductSmsCredits = async (orgId, credits = 1) => {
  try {
    // Check if organization has sufficient credits
    const creditCheck = await checkSmsCredits(orgId, credits);
    
    if (!creditCheck.sufficient) {
      throw new ApiError(403, 'Insufficient SMS credits');
    }
    
    // Deduct credits
    const [updatedOrg] = await db('organizations')
      .where('id', orgId)
      .decrement('sms_credits', credits)
      .returning('sms_credits');
    
    return {
      success: true,
      remaining_credits: updatedOrg.sms_credits
    };
  } catch (error) {
    console.error('Error deducting SMS credits:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to deduct SMS credits');
  }
};

/**
 * Top up SMS credits
 * @param {string} orgId - Organization ID
 * @param {number} amount - Amount of credits to add
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Payment URL
 */
const topUpSmsCredits = async (orgId, amount, userId) => {
  try {
    // Validate amount
    if (amount < 100) {
      throw new ApiError(400, 'Minimum top-up amount is 100 credits');
    }
    
    // Get organization details
    const organization = await db('organizations')
      .where('id', orgId)
      .first();
    
    if (!organization) {
      throw new ApiError(404, 'Organization not found');
    }
    
    // Get user details
    const user = await db('users')
      .where('id', userId)
      .first();
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    // Calculate price (R1 per credit)
    const price = amount;
    
    // Generate merchant payment ID
    const merchantPaymentId = `SMS_${orgId}_${Date.now()}`;
    
    // Create payment record
    const [paymentId] = await db('payments').insert({
      org_id: orgId,
      user_id: userId,
      amount: price,
      payment_type: 'sms_topup',
      status: 'pending',
      merchant_payment_id: merchantPaymentId,
      metadata: JSON.stringify({
        credits: amount
      })
    }).returning('id');
    
    // Create payment URL
    const paymentData = {
      returnUrl: `${process.env.CLIENT_URL}/billing/sms-success?payment_id=${paymentId}`,
      cancelUrl: `${process.env.CLIENT_URL}/billing/sms-cancel?payment_id=${paymentId}`,
      notifyUrl: `${process.env.API_URL}/api/webhooks/payfast`,
      merchantPaymentId,
      amount: price / 100, // Convert cents to rand
      itemName: `${amount} SMS Credits`,
      itemDescription: `Top up ${amount} SMS credits for ${organization.name}`,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      customStr1: paymentId,
      customStr2: orgId,
      customStr3: 'sms_topup',
      customInt1: amount,
      emailConfirmation: true,
      confirmationAddress: organization.email || user.email
    };
    
    const result = await generatePaymentUrl(paymentData);
    
    if (!result || !result.includes('payfast.co.za')) {
      throw new ApiError(500, 'Failed to generate payment URL');
    }
    
    // Log payment event
    await logPaymentEvent({
      org_id: orgId,
      user_id: userId,
      amount: price,
      currency: 'ZAR',
      payment_method: 'payfast',
      payment_type: 'sms_topup',
      status: 'pending',
      metadata: {
        payment_id: paymentId,
        credits: amount,
        merchant_payment_id: merchantPaymentId
      }
    });
    
    return {
      payment_id: paymentId,
      payment_url: result,
      amount,
      price
    };
  } catch (error) {
    console.error('Error topping up SMS credits:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to top up SMS credits');
  }
};

module.exports = {
  getSubscriptionPlans,
  getSubscriptionPlanById,
  getCurrentSubscription,
  createSubscription,
  cancelSubscription,
  changeSubscriptionPlan,
  checkEnvelopeQuota,
  checkDocumentQuota,
  checkUserQuota,
  checkSmsCredits,
  deductSmsCredits,
  topUpSmsCredits
};
