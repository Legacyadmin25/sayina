const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/db');
const { ApiError } = require('../middleware/errorMiddleware');
const logger = require('../config/winston');

/**
 * @desc    Apply a promo code to the current organisation
 * @route   POST /api/v1/billing/promo/apply
 * @access  Private (org admin)
 */
const applyPromoCode = async (req, res, next) => {
  try {
    const { code } = req.body;
    const orgId = req.user.orgId ?? req.user.org_id;

    if (!code) throw new ApiError(400, 'Promo code is required');

    // Find the code (case-insensitive)
    const promo = await db('promo_codes')
      .join('plans', 'promo_codes.plan_id', 'plans.id')
      .where(db.raw('UPPER(promo_codes.code)'), code.trim().toUpperCase())
      .where('promo_codes.is_active', true)
      .select(
        'promo_codes.id',
        'promo_codes.code',
        'promo_codes.duration_days',
        'promo_codes.max_uses',
        'promo_codes.used_count',
        'promo_codes.expires_at',
        'plans.id as plan_id',
        'plans.name as plan_name',
        'plans.envelope_limit',
        'plans.sms_credits'
      )
      .first();

    if (!promo) throw new ApiError(404, 'Invalid or expired promo code');

    // knexSnakeCaseMappers returns camelCase keys — use them consistently
    const durationDays = promo.durationDays ?? promo.duration_days;
    const maxUses      = promo.maxUses      ?? promo.max_uses;
    const usedCount    = promo.usedCount    ?? promo.used_count;
    const expiresAt    = promo.expiresAt    ?? promo.expires_at;
    const planId       = promo.planId       ?? promo.plan_id;
    const planName     = promo.planName     ?? promo.plan_name;

    // Check code hasn't expired
    if (expiresAt && new Date(expiresAt) < new Date()) {
      throw new ApiError(400, 'This promo code has expired');
    }

    // Check max uses
    if (maxUses !== null && usedCount >= maxUses) {
      throw new ApiError(400, 'This promo code has reached its usage limit');
    }

    // Check org hasn't already used this code
    const alreadyUsed = await db('promo_code_redemptions')
      .where({ promo_code_id: promo.id, org_id: orgId })
      .first();
    if (alreadyUsed) throw new ApiError(400, 'Your account has already used this promo code');

    // Check org doesn't already have an active paid subscription
    const existingPaidSub = await db('subscriptions')
      .where({ org_id: orgId, status: 'active' })
      .whereNotNull('payfast_token')
      .first();
    if (existingPaidSub) {
      throw new ApiError(400, 'Your account already has an active paid subscription. Promo codes apply to new accounts only.');
    }

    // Calculate end date from a valid integer
    const days = parseInt(durationDays, 10);
    if (!Number.isFinite(days) || days <= 0) {
      throw new ApiError(500, 'Promo code has an invalid duration. Please contact support.');
    }
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    await db.transaction(async (trx) => {
      // Deactivate any existing promo subscriptions for this org
      await trx('subscriptions')
        .where({ org_id: orgId, status: 'promo' })
        .update({ status: 'cancelled' });

      // Create new promo subscription
      const [subscription] = await trx('subscriptions')
        .insert({
          id: uuidv4(),
          org_id: orgId,
          plan_id: planId,
          payfast_token: null,
          status: 'promo',
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
          next_billing_date: endDate.toISOString(),
        })
        .returning('*');

      // Record the redemption
      await trx('promo_code_redemptions').insert({
        id: uuidv4(),
        promo_code_id: promo.id,
        org_id: orgId,
        subscription_id: subscription.id,
      });

      // Increment used count
      await trx('promo_codes')
        .where({ id: promo.id })
        .increment('used_count', 1);
    });

    logger.info(`Promo code ${promo.code} applied by org ${orgId}`);

    res.status(200).json({
      success: true,
      message: `Promo code applied! You now have access to the ${planName} plan for ${days} days.`,
      data: {
        plan_name: planName,
        duration_days: days,
        end_date: endDate,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Validate a promo code without applying it (for UI feedback)
 * @route   POST /api/v1/billing/promo/validate
 * @access  Private
 */
const validatePromoCode = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) throw new ApiError(400, 'Promo code is required');

    const promo = await db('promo_codes')
      .join('plans', 'promo_codes.plan_id', 'plans.id')
      .where(db.raw('UPPER(promo_codes.code)'), code.trim().toUpperCase())
      .where('promo_codes.is_active', true)
      .select('promo_codes.id', 'promo_codes.duration_days', 'promo_codes.max_uses',
        'promo_codes.used_count', 'promo_codes.expires_at', 'plans.name as plan_name')
      .first();

    if (!promo) return res.json({ success: false, message: 'Invalid promo code' });

    const expiresAt  = promo.expiresAt    ?? promo.expires_at;
    const maxUses    = promo.maxUses      ?? promo.max_uses;
    const usedCount  = promo.usedCount    ?? promo.used_count;
    const planName   = promo.planName     ?? promo.plan_name;
    const durationDays = promo.durationDays ?? promo.duration_days;

    if (expiresAt && new Date(expiresAt) < new Date()) {
      return res.json({ success: false, message: 'This promo code has expired' });
    }
    if (maxUses !== null && usedCount >= maxUses) {
      return res.json({ success: false, message: 'This promo code has reached its limit' });
    }

    res.json({
      success: true,
      message: `Valid! Grants ${durationDays} days of ${planName} plan for free.`,
      data: { plan_name: planName, duration_days: durationDays },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Admin endpoints ──────────────────────────────────────────────────────────

/**
 * @desc    List all promo codes
 * @route   GET /api/v1/admin/promo-codes
 * @access  Admin only
 */
const listPromoCodes = async (req, res, next) => {
  try {
    const codes = await db('promo_codes')
      .join('plans', 'promo_codes.plan_id', 'plans.id')
      .leftJoin('users', 'promo_codes.created_by', 'users.id')
      .select(
        'promo_codes.*',
        'plans.name as plan_name',
        db.raw("CONCAT(users.first_name, ' ', users.last_name) as created_by_name")
      )
      .orderBy('promo_codes.created_at', 'desc');

    res.json({ success: true, data: codes });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a promo code
 * @route   POST /api/v1/admin/promo-codes
 * @access  Admin only
 */
const createPromoCode = async (req, res, next) => {
  try {
    const { code, plan_id, duration_days, max_uses, expires_at, notes } = req.body;

    if (!code || !plan_id || !duration_days) {
      throw new ApiError(400, 'code, plan_id and duration_days are required');
    }

    const upperCode = code.trim().toUpperCase().replace(/\s+/g, '');

    // Check uniqueness
    const exists = await db('promo_codes').where({ code: upperCode }).first();
    if (exists) throw new ApiError(400, `Code "${upperCode}" already exists`);

    // Verify plan exists
    const plan = await db('plans').where({ id: plan_id, is_active: true }).first();
    if (!plan) throw new ApiError(404, 'Plan not found');

    const [created] = await db('promo_codes')
      .insert({
        id: uuidv4(),
        code: upperCode,
        plan_id,
        duration_days: parseInt(duration_days),
        max_uses: max_uses ? parseInt(max_uses) : null,
        expires_at: expires_at || null,
        notes: notes || null,
        created_by: req.user.id,
        is_active: true,
      })
      .returning('*');

    logger.info(`Promo code ${upperCode} created by admin ${req.user.id}`);
    res.status(201).json({ success: true, data: { ...created, plan_name: plan.name } });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Deactivate / reactivate a promo code
 * @route   PATCH /api/v1/admin/promo-codes/:id
 * @access  Admin only
 */
const togglePromoCode = async (req, res, next) => {
  try {
    const { id } = req.params;
    const promo = await db('promo_codes').where({ id }).first();
    if (!promo) throw new ApiError(404, 'Promo code not found');

    const currentActive = promo.isActive ?? promo.is_active;
    const [updated] = await db('promo_codes')
      .where({ id })
      .update({ is_active: !currentActive })
      .returning('*');

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

module.exports = { applyPromoCode, validatePromoCode, listPromoCodes, createPromoCode, togglePromoCode };
