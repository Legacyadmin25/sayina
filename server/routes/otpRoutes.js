const express = require('express');
const { body } = require('express-validator');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { validationErrorHandler } = require('../middleware/errorMiddleware');
const { otpLimiter } = require('../middleware/rateLimitMiddleware');
const otpController = require('../controllers/otpController');

const router = express.Router();

/**
 * @route   POST /api/v1/otp/send
 * @desc    Send OTP for general verification
 * @access  Private
 */
router.post(
  '/send',
  protect,
  [
    body('method').isIn(['sms', 'email']).withMessage('Method must be either sms or email'),
    body('destination').notEmpty().withMessage('Destination is required'),
    body('purpose').isIn(['verification', 'login', 'transaction']).withMessage('Purpose must be verification, login, or transaction'),
    validationErrorHandler
  ],
  otpController.sendOTP
);

/**
 * @route   POST /api/v1/otp/verify
 * @desc    Verify OTP for general verification
 * @access  Private
 */
router.post(
  '/verify',
  protect,
  [
    body('method').isIn(['sms', 'email']).withMessage('Method must be either sms or email'),
    body('destination').notEmpty().withMessage('Destination is required'),
    body('otp').notEmpty().withMessage('OTP is required'),
    body('purpose').isIn(['verification', 'login', 'transaction']).withMessage('Purpose must be verification, login, or transaction'),
    validationErrorHandler
  ],
  otpController.verifyOTP
);

/**
 * @route   POST /api/v1/otp/signing/send
 * @desc    Send OTP for document signing
 * @access  Public
 */
router.post(
  '/signing/send',
  otpLimiter,
  [
    body('method').isIn(['sms', 'email']).withMessage('Method must be either sms or email'),
    body('destination').notEmpty().withMessage('Destination is required'),
    body('signer_id').isUUID().withMessage('Invalid signer ID format'),
    body('envelope_id').isUUID().withMessage('Invalid envelope ID format'),
    validationErrorHandler
  ],
  otpController.sendSigningOTP
);

/**
 * @route   POST /api/v1/otp/signing/verify
 * @desc    Verify OTP for document signing
 * @access  Public
 */
router.post(
  '/signing/verify',
  otpLimiter,
  [
    body('otp').notEmpty().withMessage('OTP is required'),
    body('signer_id').isUUID().withMessage('Invalid signer ID format'),
    body('envelope_id').isUUID().withMessage('Invalid envelope ID format'),
    validationErrorHandler
  ],
  otpController.verifySigningOTP
);

module.exports = router;
