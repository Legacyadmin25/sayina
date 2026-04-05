const express = require('express');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const accessibilityController = require('../controllers/accessibilityController');

const router = express.Router();

/**
 * @route   POST /api/v1/accessibility/check
 * @desc    Check document accessibility
 * @access  Private
 */
router.post(
  '/check',
  protect,
  verifiedEmail,
  accessibilityController.checkDocumentForAccessibility
);

/**
 * @route   GET /api/v1/accessibility/check/:id
 * @desc    Get accessibility check details
 * @access  Private
 */
router.get(
  '/check/:id',
  protect,
  accessibilityController.getAccessibilityCheckDetails
);

/**
 * @route   DELETE /api/v1/accessibility/check/:id
 * @desc    Delete accessibility check
 * @access  Private
 */
router.delete(
  '/check/:id',
  protect,
  accessibilityController.deleteAccessibilityCheck
);

/**
 * @route   POST /api/v1/accessibility/generate
 * @desc    Generate accessible version of document
 * @access  Private
 */
router.post(
  '/generate',
  protect,
  verifiedEmail,
  accessibilityController.generateAccessibleDocument
);

/**
 * @route   GET /api/v1/accessibility/version/:id/download
 * @desc    Download accessible version
 * @access  Private
 */
router.get(
  '/version/:id/download',
  protect,
  accessibilityController.downloadAccessibleVersion
);

/**
 * @route   DELETE /api/v1/accessibility/version/:id
 * @desc    Delete accessible version
 * @access  Private
 */
router.delete(
  '/version/:id',
  protect,
  accessibilityController.deleteAccessibleVersion
);

/**
 * @route   GET /api/v1/accessibility/document/:documentId/checks
 * @desc    Get document accessibility checks
 * @access  Private
 */
router.get(
  '/document/:documentId/checks',
  protect,
  accessibilityController.getDocumentChecks
);

/**
 * @route   GET /api/v1/accessibility/document/:documentId/versions
 * @desc    Get document accessible versions
 * @access  Private
 */
router.get(
  '/document/:documentId/versions',
  protect,
  accessibilityController.getDocumentVersions
);

module.exports = router;
