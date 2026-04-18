const express = require('express');
const { body, param } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const { validationErrorHandler } = require('../middleware/errorMiddleware');
const { authLimiter } = require('../middleware/rateLimitMiddleware');
const authController = require('../controllers/authController');

const router = express.Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
      .withMessage('Password must contain at least one number, one uppercase letter, one lowercase letter, and one special character'),
    body('first_name').trim().notEmpty().withMessage('First name is required'),
    body('last_name').trim().notEmpty().withMessage('Last name is required'),
    body('phone').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
    body('org_name').trim().notEmpty().withMessage('Organization name is required'),
    validationErrorHandler
  ],
  authController.registerUser
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
    validationErrorHandler
  ],
  authController.loginUser
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh token
 * @access  Public
 */
router.post(
  '/refresh',
  [
    body('refresh_token').notEmpty().withMessage('Refresh token is required'),
    validationErrorHandler
  ],
  authController.refreshToken
);

/**
 * @route   POST /api/v1/auth/send-verification
 * @desc    Send verification OTP
 * @access  Private
 */
router.post(
  '/send-verification',
  protect,
  [
    body('method').isIn(['email', 'sms']).withMessage('Method must be either email or sms'),
    validationErrorHandler
  ],
  authController.sendVerificationOTP
);

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email with OTP
 * @access  Private
 */
router.post(
  '/verify-email',
  protect,
  [
    body('otp').notEmpty().withMessage('OTP is required'),
    body('method').isIn(['email', 'sms']).withMessage('Method must be either email or sms'),
    validationErrorHandler
  ],
  authController.verifyEmail
);

/**
 * @route   POST /api/v1/auth/resend-otp
 * @desc    Resend email verification OTP (no auth required)
 * @access  Public
 */
router.post(
  '/resend-otp',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    validationErrorHandler
  ],
  authController.resendOTP
);

/**
 * @route   POST /api/v1/auth/verify-otp
 * @desc    Verify email OTP (no auth required)
 * @access  Public
 */
router.post(
  '/verify-otp',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('otp').notEmpty().withMessage('OTP is required'),
    validationErrorHandler
  ],
  authController.verifyOTPPublic
);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Forgot password
 * @access  Public
 */
router.post(
  '/forgot-password',
  authLimiter,
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    validationErrorHandler
  ],
  authController.forgotPassword
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with OTP
 * @access  Public
 */
router.post(
  '/reset-password',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('otp').notEmpty().withMessage('OTP is required'),
    body('reset_token').notEmpty().withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
      .withMessage('Password must contain at least one number, one uppercase letter, one lowercase letter, and one special character'),
    validationErrorHandler
  ],
  authController.resetPassword
);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change password
 * @access  Private
 */
router.post(
  '/change-password',
  protect,
  [
    body('current_password').notEmpty().withMessage('Current password is required'),
    body('new_password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
      .withMessage('Password must contain at least one number, one uppercase letter, one lowercase letter, and one special character'),
    validationErrorHandler
  ],
  authController.changePassword
);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', protect, authController.getUserProfile);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  protect,
  [
    body('first_name').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    body('last_name').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    body('phone').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
    validationErrorHandler
  ],
  authController.updateUserProfile
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', protect, authController.logoutUser);

module.exports = router;
