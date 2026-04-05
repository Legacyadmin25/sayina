const express = require('express');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const regulatoryComplianceController = require('../controllers/regulatoryComplianceController');

const router = express.Router();

/**
 * Regulation Routes
 */

/**
 * @route   GET /api/v1/regulatory/regulations
 * @desc    Get supported regulations
 * @access  Private
 */
router.get(
  '/regulations',
  protect,
  regulatoryComplianceController.getSupportedRegulationsHandler
);

/**
 * Document Compliance Routes
 */

/**
 * @route   POST /api/v1/regulatory/documents/:documentId/check
 * @desc    Check document compliance
 * @access  Private
 */
router.post(
  '/documents/:documentId/check',
  protect,
  verifiedEmail,
  regulatoryComplianceController.checkDocumentComplianceHandler
);

/**
 * @route   GET /api/v1/regulatory/documents/:documentId/checks
 * @desc    Get document compliance checks
 * @access  Private
 */
router.get(
  '/documents/:documentId/checks',
  protect,
  regulatoryComplianceController.getDocumentComplianceChecksHandler
);

/**
 * Compliance Check Routes
 */

/**
 * @route   GET /api/v1/regulatory/checks/:checkId
 * @desc    Get compliance check
 * @access  Private
 */
router.get(
  '/checks/:checkId',
  protect,
  regulatoryComplianceController.getComplianceCheckHandler
);

/**
 * Compliance Report Routes
 */

/**
 * @route   POST /api/v1/regulatory/reports
 * @desc    Generate compliance report
 * @access  Private
 */
router.post(
  '/reports',
  protect,
  verifiedEmail,
  regulatoryComplianceController.generateComplianceReportHandler
);

/**
 * Jurisdiction Routes
 */

/**
 * @route   GET /api/v1/regulatory/jurisdictions/:jurisdictionCode
 * @desc    Get jurisdiction requirements
 * @access  Private
 */
router.get(
  '/jurisdictions/:jurisdictionCode',
  protect,
  regulatoryComplianceController.getJurisdictionRequirementsHandler
);

/**
 * Compliance Settings Routes
 */

/**
 * @route   GET /api/v1/regulatory/settings
 * @desc    Get compliance settings
 * @access  Private
 */
router.get(
  '/settings',
  protect,
  regulatoryComplianceController.getComplianceSettingsHandler
);

/**
 * @route   PUT /api/v1/regulatory/settings
 * @desc    Configure compliance settings
 * @access  Private
 */
router.put(
  '/settings',
  protect,
  verifiedEmail,
  regulatoryComplianceController.configureComplianceSettingsHandler
);

module.exports = router;
