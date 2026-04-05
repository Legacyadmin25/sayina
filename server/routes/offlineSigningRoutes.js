const express = require('express');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const offlineSigningController = require('../controllers/offlineSigningController');

const router = express.Router();

/**
 * Offline Package Management Routes
 */

/**
 * @route   POST /api/v1/offline/packages
 * @desc    Generate offline signing package
 * @access  Private
 */
router.post(
  '/packages',
  protect,
  offlineSigningController.generateOfflinePackageHandler
);

/**
 * @route   GET /api/v1/offline/packages
 * @desc    Get user's offline packages
 * @access  Private
 */
router.get(
  '/packages',
  protect,
  offlineSigningController.getUserOfflinePackagesHandler
);

/**
 * @route   GET /api/v1/offline/packages/:packageId
 * @desc    Get offline package
 * @access  Private
 */
router.get(
  '/packages/:packageId',
  protect,
  offlineSigningController.getOfflinePackageHandler
);

/**
 * @route   GET /api/v1/offline/packages/:packageId/download
 * @desc    Download offline signing package
 * @access  Private
 */
router.get(
  '/packages/:packageId/download',
  protect,
  offlineSigningController.downloadOfflinePackageHandler
);

/**
 * @route   GET /api/v1/offline/packages/:packageId/instructions
 * @desc    Generate offline signing instructions
 * @access  Private
 */
router.get(
  '/packages/:packageId/instructions',
  protect,
  offlineSigningController.generateOfflineInstructionsHandler
);

/**
 * Offline Signing Processing Routes
 */

/**
 * @route   POST /api/v1/offline/packages/:packageId/process
 * @desc    Process offline signed package
 * @access  Public
 */
router.post(
  '/packages/:packageId/process',
  offlineSigningController.processSignedPackageHandler
);

/**
 * @route   POST /api/v1/offline/packages/:packageId/validate
 * @desc    Validate offline signing package
 * @access  Public
 */
router.post(
  '/packages/:packageId/validate',
  offlineSigningController.validateOfflinePackageHandler
);

module.exports = router;
