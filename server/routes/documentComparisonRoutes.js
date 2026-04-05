const express = require('express');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const documentComparisonController = require('../controllers/documentComparisonController');

const router = express.Router();

/**
 * @route   POST /api/v1/documents/compare
 * @desc    Compare two documents
 * @access  Private
 */
router.post(
  '/',
  protect,
  verifiedEmail,
  documentComparisonController.compareDocumentVersions
);

/**
 * @route   GET /api/v1/documents/compare
 * @desc    Get organization comparisons
 * @access  Private
 */
router.get(
  '/',
  protect,
  documentComparisonController.getOrganizationComparisonsList
);

/**
 * @route   GET /api/v1/documents/compare/:id
 * @desc    Get comparison details
 * @access  Private
 */
router.get(
  '/:id',
  protect,
  documentComparisonController.getComparisonDetails
);

/**
 * @route   GET /api/v1/documents/compare/:id/download
 * @desc    Download comparison result
 * @access  Private
 */
router.get(
  '/:id/download',
  protect,
  documentComparisonController.downloadComparisonResult
);

/**
 * @route   DELETE /api/v1/documents/compare/:id
 * @desc    Delete comparison
 * @access  Private
 */
router.delete(
  '/:id',
  protect,
  documentComparisonController.deleteComparison
);

module.exports = router;
