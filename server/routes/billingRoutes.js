const express = require('express');
const { body } = require('express-validator');
const { protect, verifiedEmail, orgAdmin } = require('../middleware/authMiddleware');
const { validationErrorHandler } = require('../middleware/errorMiddleware');
const billingController = require('../controllers/billingController');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);
router.use(verifiedEmail);

/**
 * @route   GET /api/v1/billing/plans
 * @desc    Get all available plans
 * @access  Private
 */
router.get('/plans', billingController.getPlans);

/**
 * @route   GET /api/v1/billing/subscription
 * @desc    Get current subscription
 * @access  Private
 */
router.get('/subscription', billingController.getSubscription);

/**
 * @route   POST /api/v1/billing/subscribe
 * @desc    Create or change subscription
 * @access  Private (Organization Admin only)
 */
router.post(
  '/subscribe',
  orgAdmin,
  [
    body('planId').isUUID().withMessage('Invalid plan ID format'),
    validationErrorHandler
  ],
  billingController.subscribeOrChange
);

/**
 * @route   POST /api/v1/billing/subscription/cancel
 * @desc    Cancel subscription
 * @access  Private (Organization Admin only)
 */
router.post('/subscription/cancel', orgAdmin, billingController.cancelSubscriptionPlan);

/**
 * @route   GET /api/v1/billing/sms-credits
 * @desc    Get SMS credit balance
 * @access  Private
 */
router.get('/sms-credits', billingController.getSmsCredits);

/**
 * @route   POST /api/v1/billing/sms-credits/topup
 * @desc    Top up SMS credits
 * @access  Private (Organization Admin only)
 */
router.post(
  '/sms-credits/topup',
  orgAdmin,
  [
    body('plan_id').isUUID().withMessage('Invalid SMS plan ID format'),
    validationErrorHandler
  ],
  billingController.topupSmsCredits
);

/**
 * @route   GET /api/v1/billing/transactions
 * @desc    Get transaction history
 * @access  Private (Organization Admin only)
 */
router.get('/transactions', orgAdmin, billingController.getTransactions);

module.exports = router;
