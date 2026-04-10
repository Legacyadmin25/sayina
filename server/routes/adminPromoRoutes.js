const express = require('express');
const { body } = require('express-validator');
const { protect, admin } = require('../middleware/authMiddleware');
const { validationErrorHandler } = require('../middleware/errorMiddleware');
const { listPromoCodes, createPromoCode, togglePromoCode } = require('../controllers/promoController');

const router = express.Router();

router.use(protect);
router.use(admin);

/**
 * @route   GET /api/v1/admin/promo-codes
 * @desc    List all promo codes
 */
router.get('/', listPromoCodes);

/**
 * @route   POST /api/v1/admin/promo-codes
 * @desc    Create a new promo code
 */
router.post('/', [
  body('code').notEmpty().withMessage('Code is required'),
  body('plan_id').isUUID().withMessage('Valid plan ID required'),
  body('duration_days').isInt({ min: 1 }).withMessage('Duration must be at least 1 day'),
  validationErrorHandler
], createPromoCode);

/**
 * @route   PATCH /api/v1/admin/promo-codes/:id
 * @desc    Toggle active/inactive status of a promo code
 */
router.patch('/:id', togglePromoCode);

module.exports = router;
