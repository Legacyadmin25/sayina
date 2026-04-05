const express = require('express');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const documentSecurityController = require('../controllers/documentSecurityController');

const router = express.Router();

/**
 * @route   POST /api/v1/documents/:documentId/security/password-protection
 * @desc    Apply password protection to a document
 * @access  Private
 */
router.post(
  '/documents/:documentId/security/password-protection',
  protect,
  verifiedEmail,
  documentSecurityController.applyPasswordProtectionHandler
);

/**
 * @route   POST /api/v1/documents/:documentId/security/watermark
 * @desc    Apply watermark to a document
 * @access  Private
 */
router.post(
  '/documents/:documentId/security/watermark',
  protect,
  verifiedEmail,
  documentSecurityController.applyWatermarkHandler
);

/**
 * @route   POST /api/v1/documents/:documentId/security/secure-link
 * @desc    Generate secure viewing link
 * @access  Private
 */
router.post(
  '/documents/:documentId/security/secure-link',
  protect,
  verifiedEmail,
  documentSecurityController.generateSecureViewingLinkHandler
);

/**
 * @route   GET /api/v1/security/secure-view/:token
 * @desc    Validate secure viewing token
 * @access  Public
 */
router.get(
  '/security/secure-view/:token',
  documentSecurityController.validateSecureViewingTokenHandler
);

/**
 * @route   GET /api/v1/documents/:documentId/security
 * @desc    Get document security settings
 * @access  Private
 */
router.get(
  '/documents/:documentId/security',
  protect,
  documentSecurityController.getDocumentSecuritySettingsHandler
);

/**
 * @route   GET /api/v1/documents/:documentId/security/secure-links
 * @desc    Get secure viewing links
 * @access  Private
 */
router.get(
  '/documents/:documentId/security/secure-links',
  protect,
  documentSecurityController.getSecureViewingLinksHandler
);

/**
 * @route   DELETE /api/v1/security/secure-links/:linkId
 * @desc    Revoke secure viewing link
 * @access  Private
 */
router.delete(
  '/security/secure-links/:linkId',
  protect,
  verifiedEmail,
  documentSecurityController.revokeSecureViewingLinkHandler
);

/**
 * @route   GET /api/v1/documents/:documentId/security/access-logs
 * @desc    Get secure viewing access logs
 * @access  Private
 */
router.get(
  '/documents/:documentId/security/access-logs',
  protect,
  documentSecurityController.getSecureViewingAccessLogsHandler
);

module.exports = router;
