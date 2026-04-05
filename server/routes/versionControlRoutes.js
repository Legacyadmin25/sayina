const express = require('express');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const versionControlController = require('../controllers/versionControlController');

const router = express.Router();

/**
 * @route   POST /api/v1/versions/document/:documentId
 * @desc    Create a new document version
 * @access  Private
 */
router.post(
  '/document/:documentId',
  protect,
  verifiedEmail,
  versionControlController.createVersion
);

/**
 * @route   GET /api/v1/versions/document/:documentId
 * @desc    Get document versions
 * @access  Private
 */
router.get(
  '/document/:documentId',
  protect,
  versionControlController.getVersions
);

/**
 * @route   GET /api/v1/versions/document/:documentId/history
 * @desc    Get version restore history
 * @access  Private
 */
router.get(
  '/document/:documentId/history',
  protect,
  versionControlController.getRestoreHistory
);

/**
 * @route   GET /api/v1/versions/:id
 * @desc    Get version details
 * @access  Private
 */
router.get(
  '/:id',
  protect,
  versionControlController.getVersion
);

/**
 * @route   GET /api/v1/versions/:id/download
 * @desc    Download version file
 * @access  Private
 */
router.get(
  '/:id/download',
  protect,
  versionControlController.downloadVersion
);

/**
 * @route   POST /api/v1/versions/:id/restore
 * @desc    Restore document version
 * @access  Private
 */
router.post(
  '/:id/restore',
  protect,
  verifiedEmail,
  versionControlController.restoreVersion
);

/**
 * @route   DELETE /api/v1/versions/:id
 * @desc    Delete document version
 * @access  Private
 */
router.delete(
  '/:id',
  protect,
  verifiedEmail,
  versionControlController.deleteVersion
);

/**
 * @route   POST /api/v1/versions/compare
 * @desc    Compare versions
 * @access  Private
 */
router.post(
  '/compare',
  protect,
  versionControlController.compareVersions
);

module.exports = router;
