const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { db } = require('../config/db');
const { ApiError } = require('../middleware/errorMiddleware');

/**
 * @desc    Get user profile
 * @route   GET /api/v1/users/profile
 * @access  Private
 */
const getUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user details
    const user = await db('users')
      .where({ id: userId })
      .select(
        'id',
        'email',
        'first_name',
        'last_name',
        'phone',
        'role',
        'is_email_verified',
        'is_phone_verified',
        'two_factor_enabled',
        'two_factor_method',
        'last_login',
        'created_at'
      )
      .first();

    if (!user) {
      return next(new ApiError(404, 'User not found'));
    }

    // Get organization details
    const organization = await db('organizations')
      .where({ id: req.user.org_id })
      .select('id', 'name', 'logo_path', 'primary_color', 'secondary_color')
      .first();

    res.status(200).json({
      success: true,
      data: {
        user,
        organization
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/v1/users/profile
 * @access  Private
 */
const updateUserProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { first_name, last_name, phone } = req.body;
    const userId = req.user.id;

    // Update user
    await db('users')
      .where({ id: userId })
      .update({
        first_name: first_name || req.user.first_name,
        last_name: last_name || req.user.last_name,
        phone: phone !== undefined ? phone : req.user.phone,
        updated_at: db.fn.now()
      });

    // Get updated user
    const updatedUser = await db('users')
      .where({ id: userId })
      .select(
        'id',
        'email',
        'first_name',
        'last_name',
        'phone',
        'role',
        'is_email_verified',
        'is_phone_verified',
        'two_factor_enabled',
        'two_factor_method',
        'last_login',
        'created_at'
      )
      .first();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/v1/users/password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    // Get user with password
    const user = await db('users')
      .where({ id: userId })
      .select('id', 'password')
      .first();

    if (!user) {
      return next(new ApiError(404, 'User not found'));
    }

    // Check if current password is correct
    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return next(new ApiError(400, 'Current password is incorrect'));
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    // Update password
    await db('users')
      .where({ id: userId })
      .update({
        password: hashedPassword,
        updated_at: db.fn.now()
      });

    // Log password change
    await db('system_logs').insert({
      user_id: userId,
      action: 'password_changed',
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Enable/disable two-factor authentication
 * @route   PUT /api/v1/users/2fa
 * @access  Private
 */
const updateTwoFactor = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { enabled, method } = req.body;
    const userId = req.user.id;

    // Validate method if enabling 2FA
    if (enabled && !['sms', 'email'].includes(method)) {
      return next(new ApiError(400, 'Two-factor method must be either sms or email'));
    }

    // Check if user has verified the chosen method
    if (enabled) {
      const user = await db('users')
        .where({ id: userId })
        .select('is_email_verified', 'is_phone_verified', 'email', 'phone')
        .first();

      if (method === 'email' && !user.is_email_verified) {
        return next(new ApiError(400, 'Email must be verified before enabling email 2FA'));
      }

      if (method === 'sms') {
        if (!user.phone) {
          return next(new ApiError(400, 'Phone number must be added before enabling SMS 2FA'));
        }
        if (!user.is_phone_verified) {
          return next(new ApiError(400, 'Phone number must be verified before enabling SMS 2FA'));
        }
      }
    }

    // Update 2FA settings
    await db('users')
      .where({ id: userId })
      .update({
        two_factor_enabled: enabled,
        two_factor_method: enabled ? method : null,
        updated_at: db.fn.now()
      });

    // Log 2FA change
    await db('system_logs').insert({
      user_id: userId,
      action: enabled ? 'two_factor_enabled' : 'two_factor_disabled',
      metadata: JSON.stringify({
        method: enabled ? method : null
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'} successfully`,
      data: {
        two_factor_enabled: enabled,
        two_factor_method: enabled ? method : null
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user activity log
 * @route   GET /api/v1/users/activity
 * @access  Private
 */
const getUserActivity = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    // Get total count
    const totalCount = await db('system_logs')
      .where({ user_id: userId })
      .count('id as count')
      .first();

    // Get activity logs with pagination
    const activityLogs = await db('system_logs')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    res.status(200).json({
      success: true,
      data: {
        activity: activityLogs,
        pagination: {
          total: parseInt(totalCount.count),
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount.count / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user notifications
 * @route   GET /api/v1/users/notifications
 * @access  Private
 */
const getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, unread_only = false } = req.query;

    // Build query
    const query = db('notifications').where({ user_id: userId });
    
    if (unread_only === 'true' || unread_only === true) {
      query.where({ is_read: false });
    }

    // Get total count
    const totalCount = await query.clone().count('id as count').first();

    // Get notifications with pagination
    const notifications = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    // Get unread count
    const unreadCount = await db('notifications')
      .where({ user_id: userId, is_read: false })
      .count('id as count')
      .first();

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unread_count: parseInt(unreadCount.count),
        pagination: {
          total: parseInt(totalCount.count),
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount.count / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark notification as read
 * @route   PUT /api/v1/users/notifications/:id/read
 * @access  Private
 */
const markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if notification exists and belongs to user
    const notification = await db('notifications')
      .where({ id, user_id: userId })
      .first();

    if (!notification) {
      return next(new ApiError(404, 'Notification not found or does not belong to you'));
    }

    // Mark as read
    await db('notifications')
      .where({ id })
      .update({
        is_read: true,
        updated_at: db.fn.now()
      });

    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/v1/users/notifications/read-all
 * @access  Private
 */
const markAllNotificationsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Mark all as read
    await db('notifications')
      .where({ user_id: userId, is_read: false })
      .update({
        is_read: true,
        updated_at: db.fn.now()
      });

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  changePassword,
  updateTwoFactor,
  getUserActivity,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead
};
