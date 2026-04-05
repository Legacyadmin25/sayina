const express = require('express');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const complianceController = require('../controllers/complianceController');

const router = express.Router();

/**
 * @route   POST /api/v1/compliance/assess/envelope/:id
 * @desc    Assess envelope compliance
 * @access  Private
 */
router.post(
  '/assess/envelope/:id',
  protect,
  verifiedEmail,
  complianceController.assessEnvelopeComplianceById
);

/**
 * @route   POST /api/v1/compliance/report
 * @desc    Generate organization compliance report
 * @access  Private
 */
router.post(
  '/report',
  protect,
  verifiedEmail,
  complianceController.generateOrgComplianceReport
);

/**
 * @route   GET /api/v1/compliance/assessment/:id
 * @desc    Get compliance assessment details
 * @access  Private
 */
router.get(
  '/assessment/:id',
  protect,
  complianceController.getComplianceAssessmentById
);

/**
 * @route   GET /api/v1/compliance/report/:id
 * @desc    Get compliance report details
 * @access  Private
 */
router.get(
  '/report/:id',
  protect,
  complianceController.getComplianceReportById
);

/**
 * @route   GET /api/v1/compliance/reports
 * @desc    Get organization compliance reports
 * @access  Private
 */
router.get(
  '/reports',
  protect,
  complianceController.getOrgComplianceReports
);

/**
 * @route   POST /api/v1/compliance/event
 * @desc    Track compliance event
 * @access  Private
 */
router.post(
  '/event',
  protect,
  complianceController.trackComplianceEventHandler
);

/**
 * @route   GET /api/v1/compliance/report/:id/download
 * @desc    Download compliance report as PDF
 * @access  Private
 */
router.get(
  '/report/:id/download',
  protect,
  complianceController.downloadComplianceReport
);

module.exports = router;
