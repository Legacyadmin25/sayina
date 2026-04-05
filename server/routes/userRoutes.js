const express = require('express');
const { body, param } = require('express-validator');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const { validationErrorHandler } = require('../middleware/errorMiddleware');
const userController = require('../controllers/userController');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', userController.getUserProfile);

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  [
    body('first_name').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    body('last_name').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    body('phone').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
    validationErrorHandler
  ],
  userController.updateUserProfile
);

/**
 * @route   PUT /api/v1/users/password
 * @desc    Change password
 * @access  Private
 */
router.put(
  '/password',
  [
    body('current_password').notEmpty().withMessage('Current password is required'),
    body('new_password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
      .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
      .matches(/[0-9]/).withMessage('Password must contain at least one number')
      .matches(/[!@#$%^&*]/).withMessage('Password must contain at least one special character'),
    validationErrorHandler
  ],
  userController.changePassword
);

/**
 * @route   PUT /api/v1/users/2fa
 * @desc    Enable/disable two-factor authentication
 * @access  Private
 */
router.put(
  '/2fa',
  [
    body('enabled').isBoolean().withMessage('Enabled must be a boolean'),
    body('method').optional().isIn(['sms', 'email']).withMessage('Method must be either sms or email'),
    validationErrorHandler
  ],
  userController.updateTwoFactor
);

/**
 * @route   GET /api/v1/users/activity
 * @desc    Get user activity log
 * @access  Private
 */
router.get('/activity', userController.getUserActivity);

/**
 * @route   GET /api/v1/users/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get('/notifications', userController.getUserNotifications);

/**
 * @route   PUT /api/v1/users/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put(
  '/notifications/:id/read',
  [
    param('id').isUUID().withMessage('Invalid notification ID format'),
    validationErrorHandler
  ],
  userController.markNotificationRead
);

/**
 * @route   PUT /api/v1/users/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/notifications/read-all', userController.markAllNotificationsRead);

module.exports = router;
