const express = require('express');
const { protect, verifiedEmail, checkRole } = require('../middleware/authMiddleware');
const reportController = require('../controllers/reportController');

const router = express.Router();

/**
 * @route   GET /api/v1/reports/envelopes/activity
 * @desc    Generate envelope activity report
 * @access  Private (org_admin)
 */
router.get(
  '/envelopes/activity',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  reportController.generateEnvelopeActivityReport
);

/**
 * @route   GET /api/v1/reports/users/activity
 * @desc    Generate user activity report
 * @access  Private (org_admin)
 */
router.get(
  '/users/activity',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  reportController.generateUserActivityReport
);

/**
 * @route   GET /api/v1/reports/billing
 * @desc    Generate billing report
 * @access  Private (org_admin)
 */
router.get(
  '/billing',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  reportController.generateBillingReport
);

/**
 * @route   GET /api/v1/reports/signers
 * @desc    Generate signer report
 * @access  Private (org_admin)
 */
router.get(
  '/signers',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  reportController.generateSignerReport
);

module.exports = router;
