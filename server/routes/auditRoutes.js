const express = require('express');
const { protect, verifiedEmail, checkRole } = require('../middleware/authMiddleware');
const { validationErrorHandler } = require('../middleware/errorMiddleware');
const auditController = require('../controllers/auditController');

const router = express.Router();

/**
 * @route   GET /api/v1/audit/envelope/:envelopeId
 * @desc    Get audit trail for envelope
 * @access  Private
 */
router.get(
  '/envelope/:envelopeId',
  protect,
  auditController.getEnvelopeAuditTrail
);

/**
 * @route   POST /api/v1/audit/envelope/:envelopeId/generate
 * @desc    Generate audit trail PDF for envelope
 * @access  Private
 */
router.post(
  '/envelope/:envelopeId/generate',
  protect,
  verifiedEmail,
  auditController.generateAuditTrail
);

/**
 * @route   GET /api/v1/audit/download/:auditId
 * @desc    Download audit trail PDF
 * @access  Private
 */
router.get(
  '/download/:auditId',
  protect,
  auditController.downloadAuditTrail
);

/**
 * @route   GET /api/v1/audit/envelope/:envelopeId/pdf
 * @desc    Get audit trail PDF for envelope (public access with token)
 * @access  Public (with token)
 */
router.get(
  '/envelope/:envelopeId/pdf',
  auditController.getPublicAuditTrail
);

/**
 * @route   GET /api/v1/audit/system
 * @desc    Get system audit logs
 * @access  Private (admin only)
 */
router.get(
  '/system',
  protect,
  verifiedEmail,
  checkRole(['org_admin']),
  auditController.getSystemAuditLogs
);

/**
 * @route   GET /api/v1/audit/security
 * @desc    Get security audit logs
 * @access  Private (admin only)
 */
router.get(
  '/security',
  protect,
  verifiedEmail,
  checkRole(['org_admin']),
  auditController.getSecurityAuditLogs
);

module.exports = router;
