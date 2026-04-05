const express = require('express');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const biometricAuthController = require('../controllers/biometricAuthController');

const router = express.Router();

/**
 * Biometric Registration and Management Routes
 */

/**
 * @route   POST /api/v1/biometric/register
 * @desc    Register biometric data
 * @access  Private
 */
router.post(
  '/register',
  protect,
  verifiedEmail,
  biometricAuthController.registerBiometricDataHandler
);

/**
 * @route   POST /api/v1/biometric/verify
 * @desc    Verify biometric data
 * @access  Private
 */
router.post(
  '/verify',
  protect,
  biometricAuthController.verifyBiometricDataHandler
);

/**
 * @route   DELETE /api/v1/biometric/:type
 * @desc    Delete biometric data
 * @access  Private
 */
router.delete(
  '/:type',
  protect,
  verifiedEmail,
  biometricAuthController.deleteBiometricDataHandler
);

/**
 * @route   GET /api/v1/biometric
 * @desc    Get user biometric data
 * @access  Private
 */
router.get(
  '/',
  protect,
  biometricAuthController.getUserBiometricDataHandler
);

/**
 * @route   GET /api/v1/biometric/history
 * @desc    Get biometric verification history
 * @access  Private
 */
router.get(
  '/history',
  protect,
  biometricAuthController.getBiometricVerificationHistoryHandler
);

/**
 * Biometric Authentication for Signing Routes
 */

/**
 * @route   POST /api/v1/biometric/authenticate-for-signing
 * @desc    Authenticate with biometrics for signing
 * @access  Private
 */
router.post(
  '/authenticate-for-signing',
  protect,
  biometricAuthController.authenticateForSigningHandler
);

/**
 * @route   POST /api/v1/biometric/verify-signing-token
 * @desc    Verify signing token
 * @access  Private
 */
router.post(
  '/verify-signing-token',
  protect,
  biometricAuthController.verifySigningTokenHandler
);

/**
 * Signature Processing Routes
 */

/**
 * @route   POST /api/v1/biometric/process-signature
 * @desc    Process signature image
 * @access  Private
 */
router.post(
  '/process-signature',
  protect,
  biometricAuthController.processSignatureImageHandler
);

/**
 * Biometric Methods Routes
 */

/**
 * @route   GET /api/v1/biometric/methods
 * @desc    Get biometric authentication methods
 * @access  Private
 */
router.get(
  '/methods',
  protect,
  biometricAuthController.getBiometricAuthMethodsHandler
);

module.exports = router;
