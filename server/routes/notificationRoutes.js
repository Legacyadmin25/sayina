const express = require('express');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const { validationErrorHandler } = require('../middleware/errorMiddleware');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

/**
 * @route   GET /api/v1/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get(
  '/',
  protect,
  notificationController.getUserNotifications
);

/**
 * @route   PUT /api/v1/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put(
  '/:id/read',
  protect,
  notificationController.markNotificationRead
);

/**
 * @route   PUT /api/v1/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put(
  '/read-all',
  protect,
  notificationController.markAllNotificationsRead
);

/**
 * @route   DELETE /api/v1/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete(
  '/:id',
  protect,
  notificationController.deleteNotification
);

/**
 * @route   DELETE /api/v1/notifications/delete-all
 * @desc    Delete all notifications
 * @access  Private
 */
router.delete(
  '/delete-all',
  protect,
  notificationController.deleteAllNotifications
);

/**
 * @route   GET /api/v1/notifications/settings
 * @desc    Get notification settings
 * @access  Private
 */
router.get(
  '/settings',
  protect,
  notificationController.getNotificationSettings
);

/**
 * @route   PUT /api/v1/notifications/settings
 * @desc    Update notification settings
 * @access  Private
 */
router.put(
  '/settings',
  protect,
  verifiedEmail,
  notificationController.updateNotificationSettings
);

/**
 * @route   GET /api/v1/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get(
  '/unread-count',
  protect,
  notificationController.getUnreadCount
);

module.exports = router;
