const express = require('express');
const { protect, verifiedEmail, checkRole } = require('../middleware/authMiddleware');
const analyticsController = require('../controllers/analyticsController');

const router = express.Router();

/**
 * @route   GET /api/v1/analytics/envelopes
 * @desc    Get envelope analytics
 * @access  Private (org_admin)
 */
router.get(
  '/envelopes',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  analyticsController.getEnvelopeAnalytics
);

/**
 * @route   GET /api/v1/analytics/signers
 * @desc    Get signer analytics
 * @access  Private (org_admin)
 */
router.get(
  '/signers',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  analyticsController.getSignerAnalytics
);

/**
 * @route   GET /api/v1/analytics/documents
 * @desc    Get document analytics
 * @access  Private (org_admin)
 */
router.get(
  '/documents',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  analyticsController.getDocumentAnalytics
);

/**
 * @route   GET /api/v1/analytics/usage
 * @desc    Get usage analytics
 * @access  Private (org_admin)
 */
router.get(
  '/usage',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  analyticsController.getUsageAnalytics
);

/**
 * @route   GET /api/v1/analytics/dashboard
 * @desc    Get organization dashboard summary
 * @access  Private (org_admin)
 */
router.get(
  '/dashboard',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  analyticsController.getDashboardSummary
);

module.exports = router;
