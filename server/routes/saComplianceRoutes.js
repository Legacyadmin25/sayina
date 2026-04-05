const express = require('express');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const saComplianceController = require('../controllers/saComplianceController');

const router = express.Router();

/**
 * ECT Act Compliance Routes
 */

/**
 * @route   POST /api/v1/compliance/ect-act/documents/:documentId
 * @desc    Validate document for ECT Act compliance
 * @access  Private
 */
router.post(
  '/ect-act/documents/:documentId',
  protect,
  saComplianceController.validateEctActComplianceHandler
);

/**
 * POPIA Compliance Routes
 */

/**
 * @route   POST /api/v1/compliance/popia/organization
 * @desc    Validate POPIA compliance
 * @access  Private
 */
router.post(
  '/popia/organization',
  protect,
  verifiedEmail,
  saComplianceController.validatePopiaComplianceHandler
);

/**
 * @route   POST /api/v1/compliance/popia/consent
 * @desc    Create POPIA consent record
 * @access  Private
 */
router.post(
  '/popia/consent',
  protect,
  saComplianceController.createPopiaConsentRecordHandler
);

/**
 * @route   GET /api/v1/compliance/popia/consent
 * @desc    Get user consent records
 * @access  Private
 */
router.get(
  '/popia/consent',
  protect,
  saComplianceController.getUserConsentRecordsHandler
);

/**
 * Compliance Reports Routes
 */

/**
 * @route   POST /api/v1/compliance/reports
 * @desc    Generate compliance report
 * @access  Private
 */
router.post(
  '/reports',
  protect,
  verifiedEmail,
  saComplianceController.generateComplianceReportHandler
);

/**
 * @route   GET /api/v1/compliance/reports
 * @desc    Get compliance reports
 * @access  Private
 */
router.get(
  '/reports',
  protect,
  saComplianceController.getComplianceReportsHandler
);

/**
 * @route   GET /api/v1/compliance/reports/:reportId
 * @desc    Get compliance report by ID
 * @access  Private
 */
router.get(
  '/reports/:reportId',
  protect,
  saComplianceController.getComplianceReportByIdHandler
);

/**
 * @route   GET /api/v1/compliance/reports/:reportId/download
 * @desc    Download compliance report
 * @access  Private
 */
router.get(
  '/reports/:reportId/download',
  protect,
  saComplianceController.downloadComplianceReportHandler
);

/**
 * @route   GET /api/v1/compliance/history
 * @desc    Get compliance history
 * @access  Private
 */
router.get(
  '/history',
  protect,
  saComplianceController.getComplianceHistoryHandler
);

module.exports = router;
