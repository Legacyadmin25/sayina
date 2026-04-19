const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/db');
const { ApiError } = require('../middleware/errorMiddleware');
const { 
  generateOneTimePaymentUrl, 
  generateSubscriptionUrl,
  fetchSubscription,
  cancelSubscription
} = require('../services/paymentService');
const logger = require('../config/winston');
const { sendEmail } = require('../services/emailService');

/**
 * @desc    Get all available plans
 * @route   GET /api/v1/billing/plans
 * @access  Private
 */
const getPlans = async (req, res, next) => {
  try {
    // Get subscription plans (excluding SMS top-up plans)
    const subscriptionPlans = await db('plans')
      .where('billing_cycle', 'monthly')
      .where('is_active', true)
      .orderBy('price', 'asc');

    // Get SMS top-up plans
    const smsPlans = await db('plans')
      .where('billing_cycle', 'once')
      .where('is_active', true)
      .orderBy('price', 'asc');

    res.status(200).json({
      success: true,
      data: {
        subscription_plans: subscriptionPlans,
        sms_plans: smsPlans
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current subscription
 * @route   GET /api/v1/billing/subscription
 * @access  Private
 */
const getSubscription = async (req, res, next) => {
  try {
    const orgId = req.user.org_id;

    // Get current subscription
    const subscription = await db('subscriptions')
      .join('plans', 'subscriptions.plan_id', 'plans.id')
      .where('subscriptions.org_id', orgId)
      .where('subscriptions.status', 'active')
      .select(
        'subscriptions.id',
        'subscriptions.status',
        'subscriptions.start_date',
        'subscriptions.next_billing_date',
        'subscriptions.payfast_token',
        'plans.id as plan_id',
        'plans.name as plan_name',
        'plans.description as plan_description',
        'plans.price',
        'plans.currency',
        'plans.envelope_limit',
        'plans.sms_credits',
        'plans.custom_branding',
        'plans.remove_watermark',
        'plans.api_access',
        'plans.priority_support'
      )
      .first();

    if (!subscription) {
      return res.status(200).json({
        success: true,
        data: { subscription: null }
      });
    }

    // Get usage statistics
    const billingStartDate = new Date(subscription.nextBillingDate ?? subscription.next_billing_date ?? Date.now());
    billingStartDate.setMonth(billingStartDate.getMonth() - 1);

    // Get envelope count for current billing period
    const envelopeCount = await db('envelopes')
      .where('org_id', orgId)
      .where('created_at', '>=', billingStartDate.toISOString())
      .count('id as count')
      .first();

    // Get SMS usage for current billing period
    const smsUsage = await db('sms_logs')
      .where('org_id', orgId)
      .where('created_at', '>=', billingStartDate)
      .sum('count as total')
      .first();

    // Format response with usage data
    const subscriptionWithUsage = {
      ...subscription,
      envelopes_used: parseInt(envelopeCount.count) || 0,
      sms_used: parseInt(smsUsage.total) || 0
    };

    res.status(200).json({
      success: true,
      data: { subscription: subscriptionWithUsage }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create or change subscription
 * @route   POST /api/v1/billing/subscribe
 * @access  Private (Organization Admin only)
 */
const subscribeOrChange = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { planId } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    const user = req.user;

    // Check if plan exists
    const plan = await db('plans')
      .where('id', planId)
      .where('is_active', true)
      .first();

    if (!plan) {
      return next(new ApiError(404, 'Plan not found or inactive'));
    }

    // Check if organization has an active subscription
    const existingSubscription = await db('subscriptions')
      .where('org_id', orgId)
      .where('status', 'active')
      .first();

    // Get organization details
    const organization = await db('organizations')
      .where('id', orgId)
      .first();

    if (!organization) {
      return next(new ApiError(404, 'Organization not found'));
    }

    // Create a transaction ID for this subscription
    const transactionId = uuidv4();

    // If changing plans, we'll need to handle differently
    const isChangingPlan = existingSubscription && existingSubscription.plan_id !== planId;

    // Prepare subscription data for PayFast
    const subscriptionData = {
      amount: plan.price,
      itemName: `${plan.name} Plan - ${organization.name}`,
      itemDescription: plan.description,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      billingDate: new Date().getDate(), // Bill on the same day each month
      frequency: 3, // Monthly
      cycles: 0, // Ongoing until cancelled
      returnUrl: `${process.env.CLIENT_URL}/account/subscription?status=success`,
      cancelUrl: `${process.env.CLIENT_URL}/account/subscription?status=cancelled`,
      notifyUrl: `${process.env.API_URL}/api/v1/webhooks/payfast`,
      customStr1: transactionId,
      customStr2: orgId,
      customStr3: planId
    };

    // Generate PayFast subscription URL
    const paymentResult = await generateSubscriptionUrl(subscriptionData);

    if (!paymentResult.success) {
      return next(new ApiError(500, 'Failed to generate payment URL', paymentResult.error));
    }

    // Save transaction record
    await db('transactions').insert({
      id: transactionId,
      org_id: orgId,
      user_id: userId,
      amount: plan.price,
      currency: plan.currency,
      description: `Subscription to ${plan.name} Plan`,
      status: 'pending',
      gateway: 'payfast',
      gateway_transaction_id: null, // Will be updated when PayFast callback is received
      metadata: JSON.stringify({
        plan_id: planId,
        plan_name: plan.name,
        is_subscription: true,
        is_plan_change: isChangingPlan
      }),
      created_at: new Date().toISOString()
    });

    // Log the subscription request
    logger.info(`Subscription request initiated for organization ${orgId} to plan ${planId}`, {
      userId,
      orgId,
      planId,
      transactionId
    });

    // Return the payment URL to redirect the user to PayFast
    res.status(200).json({
      success: true,
      data: {
        paymentUrl: paymentResult.paymentUrl,
        transactionId
      }
    });
  } catch (error) {
    logger.error('Error creating subscription:', error);
    next(error);
  }
};

/**
 * @desc    Cancel subscription
 * @route   POST /api/v1/billing/subscription/cancel
 * @access  Private (Organization Admin only)
 */
const cancelSubscriptionPlan = async (req, res, next) => {
  try {
    const orgId = req.user.org_id;
    const userId = req.user.id;

    // Get current subscription
    const subscription = await db('subscriptions')
      .join('plans', 'subscriptions.plan_id', 'plans.id')
      .where('subscriptions.org_id', orgId)
      .where('subscriptions.status', 'active')
      .select(
        'subscriptions.*',
        'plans.name as plan_name'
      )
      .first();

    if (!subscription) {
      return next(new ApiError(404, 'No active subscription found'));
    }

    // Cancel subscription with PayFast
    if (subscription.payfast_token) {
      const cancelResult = await cancelSubscription(subscription.payfast_token);
      
      if (!cancelResult.success) {
        return next(new ApiError(500, 'Failed to cancel subscription with payment provider', cancelResult.error));
      }
    }

    // Update subscription status in the database
    await db('subscriptions')
      .where('id', subscription.id)
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
        cancelled_at: new Date().toISOString()
      });

    // Log subscription cancellation
    logger.info(`Subscription cancelled for organization ${orgId}`, {
      userId,
      orgId,
      subscriptionId: subscription.id,
      planName: subscription.plan_name
    });

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: {
        subscription_id: subscription.id,
        plan_name: subscription.plan_name,
        cancelled_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error cancelling subscription:', error);
    next(error);
  }
};

/**
 * @desc    Get SMS credit balance
 * @route   GET /api/v1/billing/sms-credits
 * @access  Private
 */
const getSmsCredits = async (req, res, next) => {
  try {
    const orgId = req.user.org_id;

    // Get SMS credits balance from active subscription
    const subscription = await db('subscriptions')
      .join('plans', 'subscriptions.plan_id', 'plans.id')
      .where('subscriptions.org_id', orgId)
      .where('subscriptions.status', 'active')
      .select('plans.sms_credits')
      .first();

    if (!subscription) {
      return res.status(200).json({
        success: true,
        data: { sms_credits: 0 }
      });
    }

    // Get additional SMS credits purchased
    const additionalCredits = await db('sms_credits')
      .where('org_id', orgId)
      .where('status', 'active')
      .sum('credits as total')
      .first();

    // Get SMS usage for current billing period
    const billingStartDate = new Date();
    billingStartDate.setDate(1);
    billingStartDate.setHours(0, 0, 0, 0);

    const smsUsage = await db('sms_logs')
      .where('org_id', orgId)
      .where('created_at', '>=', billingStartDate)
      .sum('count as total')
      .first();

    const usedCredits = parseInt(smsUsage.total) || 0;
    const totalCredits = subscription.sms_credits + (parseInt(additionalCredits.total) || 0);
    const remainingCredits = Math.max(0, totalCredits - usedCredits);

    res.status(200).json({
      success: true,
      data: {
        total_credits: totalCredits,
        used_credits: usedCredits,
        remaining_credits: remainingCredits
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Top up SMS credits
 * @route   POST /api/v1/billing/sms-topup
 * @access  Private
 */
const topupSmsCredits = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { credits } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    const user = req.user;

    // Validate credits amount
    if (credits < 10) {
      return next(new ApiError(400, 'Minimum SMS topup is 10 credits'));
    }

    // Get SMS topup rate
    const smsPlan = await db('plans')
      .where('billing_cycle', 'once')
      .where('is_active', true)
      .orderBy('created_at', 'desc')
      .first();

    if (!smsPlan) {
      return next(new ApiError(404, 'SMS plan not found'));
    }

    // Calculate cost based on credits and SMS rate
    const amount = (credits * smsPlan.price) / smsPlan.sms_credits;

    // Get organization details
    const organization = await db('organizations')
      .where('id', orgId)
      .first();

    if (!organization) {
      return next(new ApiError(404, 'Organization not found'));
    }

    // Create transaction ID for this purchase
    const transactionId = uuidv4();

    // Prepare payment data for PayFast
    const paymentData = {
      amount: amount.toFixed(2),
      itemName: `${credits} SMS Credits - ${organization.name}`,
      itemDescription: `Top up of ${credits} SMS credits for ${organization.name}`,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      returnUrl: `${process.env.CLIENT_URL}/account/sms-topup?status=success`,
      cancelUrl: `${process.env.CLIENT_URL}/account/sms-topup?status=cancelled`,
      notifyUrl: `${process.env.API_URL}/api/v1/webhooks/payfast`,
      customStr1: transactionId,
      customStr2: orgId,
      customStr3: `sms-topup-${credits}`
    };

    // Generate PayFast payment URL for one-time payment
    const paymentResult = await generateOneTimePaymentUrl(paymentData);

    if (!paymentResult.success) {
      return next(new ApiError(500, 'Failed to generate payment URL', paymentResult.error));
    }

    // Save transaction record
    await db('transactions').insert({
      id: transactionId,
      org_id: orgId,
      user_id: userId,
      amount: parseFloat(amount.toFixed(2)),
      currency: smsPlan.currency,
      description: `SMS Credits Topup: ${credits} credits`,
      status: 'pending',
      gateway: 'payfast',
      gateway_transaction_id: null, // Will be updated when PayFast callback is received
      metadata: JSON.stringify({
        credits,
        sms_topup: true
      }),
      created_at: new Date().toISOString()
    });

    // Log the SMS topup request
    logger.info(`SMS topup request initiated for organization ${orgId}`, {
      userId,
      orgId,
      credits,
      amount: amount.toFixed(2),
      transactionId
    });

    // Return the payment URL to redirect the user to PayFast
    res.status(200).json({
      success: true,
      data: {
        paymentUrl: paymentResult.paymentUrl,
        amount: amount.toFixed(2),
        credits,
        transactionId
      }
    });
  } catch (error) {
    logger.error('Error processing SMS topup:', error);
    next(error);
  }
};

/**
 * @desc    Get transaction history
 * @route   GET /api/v1/billing/transactions
 * @access  Private
 */
const getTransactions = async (req, res, next) => {
  try {
    const orgId = req.user.org_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get transactions
    const transactions = await db('transactions')
      .where('org_id', orgId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db('transactions')
      .where('org_id', orgId)
      .count('id as count');

    // Return paginated results
    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          total: parseInt(count),
          page,
          limit,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Check usage thresholds and send notifications
 * @access  Internal function
 */
const checkUsageThresholds = async () => {
  try {
    logger.info('Running usage threshold check job');

    // Get all active organizations with their subscriptions
    const orgs = await db('organizations')
      .join('subscriptions', 'organizations.id', 'subscriptions.org_id')
      .join('plans', 'subscriptions.plan_id', 'plans.id')
      .where('subscriptions.status', 'active')
      .select(
        'organizations.id as org_id',
        'organizations.name as org_name',
        'plans.envelope_limit',
        'plans.sms_credits',
        'subscriptions.next_billing_date'
      );

    const thresholds = [80, 100]; // Percentage thresholds to check

    for (const org of orgs) {
      // Calculate billing period start date
      const billingStartDate = new Date(org.next_billing_date);
      billingStartDate.setMonth(billingStartDate.getMonth() - 1);

      // Get envelope usage
      const envelopeUsage = await db('envelopes')
        .where('org_id', org.org_id)
        .where('created_at', '>=', billingStartDate)
        .count('id as count')
        .first();

      // Get SMS usage
      const smsUsage = await db('sms_logs')
        .where('org_id', org.org_id)
        .where('created_at', '>=', billingStartDate)
        .sum('count as total')
        .first();

      const envelopesUsed = parseInt(envelopeUsage.count) || 0;
      const smsUsed = parseInt(smsUsage.total) || 0;

      // Calculate usage percentages
      const envelopePercentage = Math.round((envelopesUsed / org.envelope_limit) * 100);
      const smsPercentage = Math.round((smsUsed / org.sms_credits) * 100);

      // Get organization admins to notify
      const admins = await db('users')
        .where('org_id', org.org_id)
        .where('role', 'admin')
        .where('is_active', true)
        .select('id', 'email', 'first_name', 'last_name');

      // Check each threshold and send notifications if needed
      for (const threshold of thresholds) {
        // Check envelope usage threshold
        if (envelopePercentage >= threshold) {
          // Check if we've already sent a notification for this threshold in this billing period
          const existingNotification = await db('usage_notifications')
            .where('org_id', org.org_id)
            .where('resource_type', 'envelope')
            .where('threshold', threshold)
            .where('billing_period', org.next_billing_date)
            .first();

          if (!existingNotification) {
            // Send notifications to all org admins
            for (const admin of admins) {
              // Create in-app notification
              await db('notifications').insert({
                id: uuidv4(),
                user_id: admin.id,
                type: 'usage_alert',
                title: `Envelope Usage at ${envelopePercentage}%`,
                message: `Your organization has used ${envelopesUsed} of ${org.envelope_limit} available envelopes (${envelopePercentage}%) for this billing period.`,
                is_read: false,
                metadata: JSON.stringify({
                  resource_type: 'envelope',
                  threshold,
                  usage: envelopesUsed,
                  limit: org.envelope_limit,
                  percentage: envelopePercentage
                }),
                created_at: new Date().toISOString()
              });

              // Send email notification
              const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background-color:#3a86ff;padding:20px;text-align:center;border-radius:5px 5px 0 0;">
                    <h2 style="color:#ffffff;margin:0;">Usage Alert: Envelope Limit</h2>
                  </div>
                  <div style="padding:20px;">
                    <p>Hello ${admin.first_name},</p>
                    <p>Your organization <strong>${org.org_name}</strong> has used <strong>${envelopesUsed}</strong> of <strong>${org.envelope_limit}</strong> available envelopes (${envelopePercentage}%) for this billing period.</p>
                    ${threshold === 100 ? '<p><strong>You have reached your envelope limit.</strong> Additional envelopes will not be available until your next billing cycle, or you can upgrade your plan for more capacity.</p>' : '<p>Consider upgrading your plan if you expect to exceed your limit before the next billing cycle.</p>'}
                    <p style="text-align:center;"><a href="${process.env.CLIENT_URL}/account/subscription" style="background-color: #3a86ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Subscription</a></p>
                  </div>
                  <div style="background-color:#f8f9fa;padding:15px;text-align:center;font-size:12px;color:#666;border-top:1px solid #eee;">
                    <p>&copy; ${new Date().getFullYear()} Sayina. All rights reserved.</p>
                    <p>Powered by <strong>Sayina</strong> E-Signature Service</p>
                  </div>
                </div>
              `;

              await sendEmail(
                admin.email,
                `Sayina: Envelope Usage at ${envelopePercentage}%`,
                emailHtml
              );
            }

            // Record that we've sent this notification
            await db('usage_notifications').insert({
              id: uuidv4(),
              org_id: org.org_id,
              resource_type: 'envelope',
              threshold,
              usage: envelopesUsed,
              limit: org.envelope_limit,
              percentage: envelopePercentage,
              billing_period: org.next_billing_date,
              created_at: new Date().toISOString()
            });

            logger.info(`Sent envelope usage alert (${threshold}%) to organization ${org.org_id}`);
          }
        }

        // Check SMS usage threshold
        if (smsPercentage >= threshold) {
          // Check if we've already sent a notification for this threshold in this billing period
          const existingNotification = await db('usage_notifications')
            .where('org_id', org.org_id)
            .where('resource_type', 'sms')
            .where('threshold', threshold)
            .where('billing_period', org.next_billing_date)
            .first();

          if (!existingNotification) {
            // Send notifications to all org admins
            for (const admin of admins) {
              // Create in-app notification
              await db('notifications').insert({
                id: uuidv4(),
                user_id: admin.id,
                type: 'usage_alert',
                title: `SMS Usage at ${smsPercentage}%`,
                message: `Your organization has used ${smsUsed} of ${org.sms_credits} available SMS credits (${smsPercentage}%) for this billing period.`,
                is_read: false,
                metadata: JSON.stringify({
                  resource_type: 'sms',
                  threshold,
                  usage: smsUsed,
                  limit: org.sms_credits,
                  percentage: smsPercentage
                }),
                created_at: new Date().toISOString()
              });

              // Send email notification
              const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background-color:#3a86ff;padding:20px;text-align:center;border-radius:5px 5px 0 0;">
                    <h2 style="color:#ffffff;margin:0;">Usage Alert: SMS Credit Limit</h2>
                  </div>
                  <div style="padding:20px;">
                    <p>Hello ${admin.first_name},</p>
                    <p>Your organization <strong>${org.org_name}</strong> has used <strong>${smsUsed}</strong> of <strong>${org.sms_credits}</strong> available SMS credits (${smsPercentage}%) for this billing period.</p>
                    ${threshold === 100 ? '<p><strong>You have reached your SMS credit limit.</strong> Additional SMS messages will not be available until your next billing cycle, or you can purchase more credits.</p>' : '<p>Consider purchasing additional SMS credits if you expect to exceed your limit before the next billing cycle.</p>'}
                    <p style="text-align:center;"><a href="${process.env.CLIENT_URL}/account/sms-topup" style="background-color: #3a86ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Purchase SMS Credits</a></p>
                  </div>
                  <div style="background-color:#f8f9fa;padding:15px;text-align:center;font-size:12px;color:#666;border-top:1px solid #eee;">
                    <p>&copy; ${new Date().getFullYear()} Sayina. All rights reserved.</p>
                    <p>Powered by <strong>Sayina</strong> E-Signature Service</p>
                  </div>
                </div>
              `;

              await sendEmail(
                admin.email,
                `Sayina: SMS Usage at ${smsPercentage}%`,
                emailHtml
              );
            }

            // Record that we've sent this notification
            await db('usage_notifications').insert({
              id: uuidv4(),
              org_id: org.org_id,
              resource_type: 'sms',
              threshold,
              usage: smsUsed,
              limit: org.sms_credits,
              percentage: smsPercentage,
              billing_period: org.next_billing_date,
              created_at: new Date().toISOString()
            });

            logger.info(`Sent SMS usage alert (${threshold}%) to organization ${org.org_id}`);
          }
        }
      }
    }

    logger.info('Completed usage threshold check job');
    return { success: true, message: 'Usage threshold check completed successfully' };
  } catch (error) {
    logger.error('Error in usage threshold check job:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  getPlans,
  getSubscription,
  subscribeOrChange,
  cancelSubscriptionPlan,
  getSmsCredits,
  topupSmsCredits,
  getTransactions,
  checkUsageThresholds
};
