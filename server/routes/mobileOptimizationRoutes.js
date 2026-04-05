const express = require('express');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const mobileOptimizationController = require('../controllers/mobileOptimizationController');

const router = express.Router();

/**
 * @route   POST /api/v1/mobile/envelopes/:envelopeId/signers/:signerId/url
 * @desc    Generate mobile signing URL
 * @access  Private
 */
router.post(
  '/envelopes/:envelopeId/signers/:signerId/url',
  protect,
  verifiedEmail,
  mobileOptimizationController.generateMobileSigningUrlHandler
);

/**
 * @route   GET /api/v1/mobile/sign/:token
 * @desc    Validate mobile signing token
 * @access  Public
 */
router.get(
  '/sign/:token',
  mobileOptimizationController.validateMobileSigningTokenHandler
);

/**
 * @route   POST /api/v1/mobile/documents/:documentId/optimize
 * @desc    Optimize document for mobile viewing
 * @access  Private
 */
router.post(
  '/documents/:documentId/optimize',
  protect,
  mobileOptimizationController.optimizeDocumentForMobileHandler
);

/**
 * @route   POST /api/v1/mobile/signers/:signerId/notify
 * @desc    Send mobile signing notification
 * @access  Private
 */
router.post(
  '/signers/:signerId/notify',
  protect,
  mobileOptimizationController.sendMobileSigningNotificationHandler
);

/**
 * @route   POST /api/v1/mobile/signers/:signerId/signature
 * @desc    Process touch signature
 * @access  Public
 */
router.post(
  '/signers/:signerId/signature',
  mobileOptimizationController.processTouchSignatureHandler
);

/**
 * @route   POST /api/v1/mobile/sessions/:sessionId/device-info
 * @desc    Track mobile device info
 * @access  Public
 */
router.post(
  '/sessions/:sessionId/device-info',
  mobileOptimizationController.trackMobileDeviceInfoHandler
);

/**
 * @route   GET /api/v1/mobile/statistics
 * @desc    Get mobile signing statistics
 * @access  Private
 */
router.get(
  '/statistics',
  protect,
  mobileOptimizationController.getMobileSigningStatisticsHandler
);

/**
 * @route   GET /api/v1/mobile/documents/:documentId/download
 * @desc    Download mobile-optimized document
 * @access  Public (with token)
 */
router.get(
  '/documents/:documentId/download',
  mobileOptimizationController.downloadMobileOptimizedDocumentHandler
);

module.exports = router;
