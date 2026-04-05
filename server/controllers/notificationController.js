const { v4: uuidv4 } = require('uuid');
const { ApiError } = require('../middleware/errorMiddleware');
const db = require('../config/db');
const { sendSMS } = require('../utils/smsHelper');
const { checkSmsCredits, deductSmsCredits } = require('../utils/subscriptionHelper');
const { logSystemEvent } = require('../services/loggerService');
const { sendNotificationEmail } = require('../services/emailService');

/**
 * @desc    Get user notifications
 * @route   GET /api/v1/notifications
 * @access  Private
 */
const getUserNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unread_only } = req.query;
    const userId = req.user.id;
    const offset = (page - 1) * limit;

    // Build query
    let query = db('notifications')
      .where('user_id', userId);

    // Filter by unread
    if (unread_only === 'true') {
      query = query.where('read', false);
    }

    // Get total count
    const countQuery = query.clone();
    const { count } = await countQuery.count('id as count').first();

    // Get paginated notifications
    const notifications = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Format notifications
    const formattedNotifications = notifications.map(notification => ({
      ...notification,
      metadata: JSON.parse(notification.metadata || '{}')
    }));

    res.status(200).json({
      success: true,
      count: parseInt(count),
      pages: Math.ceil(count / limit),
      current_page: parseInt(page),
      data: formattedNotifications
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark notification as read
 * @route   PUT /api/v1/notifications/:id/read
 * @access  Private
 */
const markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if notification exists and belongs to user
    const notification = await db('notifications')
      .where('id', id)
      .where('user_id', userId)
      .first();

    if (!notification) {
      return next(new ApiError(404, 'Notification not found or does not belong to you'));
    }

    // Mark as read
    await db('notifications')
      .where('id', id)
      .update({
        read: true,
        read_at: db.fn.now()
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
 * @route   PUT /api/v1/notifications/read-all
 * @access  Private
 */
const markAllNotificationsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Mark all as read
    await db('notifications')
      .where('user_id', userId)
      .where('read', false)
      .update({
        read: true,
        read_at: db.fn.now()
      });

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete notification
 * @route   DELETE /api/v1/notifications/:id
 * @access  Private
 */
const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if notification exists and belongs to user
    const notification = await db('notifications')
      .where('id', id)
      .where('user_id', userId)
      .first();

    if (!notification) {
      return next(new ApiError(404, 'Notification not found or does not belong to you'));
    }

    // Delete notification
    await db('notifications')
      .where('id', id)
      .delete();

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete all notifications
 * @route   DELETE /api/v1/notifications/delete-all
 * @access  Private
 */
const deleteAllNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Delete all notifications
    await db('notifications')
      .where('user_id', userId)
      .delete();

    res.status(200).json({
      success: true,
      message: 'All notifications deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get notification settings
 * @route   GET /api/v1/notifications/settings
 * @access  Private
 */
const getNotificationSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user settings
    const user = await db('users')
      .where('id', userId)
      .select('email_notifications', 'sms_notifications', 'push_notifications')
      .first();

    // Get notification preferences
    const preferences = await db('notification_preferences')
      .where('user_id', userId)
      .first();

    // Default preferences if none exist
    const defaultPreferences = {
      envelope_sent: true,
      envelope_viewed: true,
      envelope_signed: true,
      envelope_completed: true,
      envelope_declined: true,
      envelope_expired: true,
      comment_added: true,
      user_invited: true,
      payment_success: true,
      payment_failed: true
    };

    res.status(200).json({
      success: true,
      data: {
        channels: {
          email: user.email_notifications,
          sms: user.sms_notifications,
          push: user.push_notifications || false
        },
        preferences: preferences ? JSON.parse(preferences.preferences) : defaultPreferences
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update notification settings
 * @route   PUT /api/v1/notifications/settings
 * @access  Private
 */
const updateNotificationSettings = async (req, res, next) => {
  try {
    const { channels, preferences } = req.body;
    const userId = req.user.id;

    // Update channels
    if (channels) {
      await db('users')
        .where('id', userId)
        .update({
          email_notifications: channels.email !== undefined ? channels.email : db.raw('email_notifications'),
          sms_notifications: channels.sms !== undefined ? channels.sms : db.raw('sms_notifications'),
          push_notifications: channels.push !== undefined ? channels.push : db.raw('push_notifications')
        });
    }

    // Update preferences
    if (preferences) {
      // Check if preferences exist
      const existingPreferences = await db('notification_preferences')
        .where('user_id', userId)
        .first();

      if (existingPreferences) {
        // Update existing preferences
        await db('notification_preferences')
          .where('user_id', userId)
          .update({
            preferences: JSON.stringify(preferences),
            updated_at: db.fn.now()
          });
      } else {
        // Create new preferences
        await db('notification_preferences').insert({
          user_id: userId,
          preferences: JSON.stringify(preferences)
        });
      }
    }

    // Get updated settings
    const user = await db('users')
      .where('id', userId)
      .select('email_notifications', 'sms_notifications', 'push_notifications')
      .first();

    const updatedPreferences = await db('notification_preferences')
      .where('user_id', userId)
      .first();

    res.status(200).json({
      success: true,
      message: 'Notification settings updated successfully',
      data: {
        channels: {
          email: user.email_notifications,
          sms: user.sms_notifications,
          push: user.push_notifications || false
        },
        preferences: updatedPreferences ? JSON.parse(updatedPreferences.preferences) : {}
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get unread notification count
 * @route   GET /api/v1/notifications/unread-count
 * @access  Private
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get unread count
    const { count } = await db('notifications')
      .where('user_id', userId)
      .where('read', false)
      .count('id as count')
      .first();

    res.status(200).json({
      success: true,
      count: parseInt(count)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create notification (internal function)
 * @param {Object} notificationData - Notification data
 * @returns {Promise<string>} - Notification ID
 */
const createNotification = async (notificationData) => {
  try {
    const {
      user_id,
      type,
      title,
      message,
      metadata = {},
      send_email = false,
      send_sms = false
    } = notificationData;

    // Get user
    const user = await db('users')
      .where('id', user_id)
      .select('email', 'phone', 'email_notifications', 'sms_notifications', 'org_id')
      .first();

    if (!user) {
      throw new Error(`User not found: ${user_id}`);
    }

    // Check notification preferences
    const preferences = await db('notification_preferences')
      .where('user_id', user_id)
      .first();

    let userPreferences = {};
    if (preferences) {
      userPreferences = JSON.parse(preferences.preferences);
    }

    // Check if user wants this type of notification
    const notificationTypeMap = {
      'envelope_sent': 'envelope_sent',
      'envelope_viewed': 'envelope_viewed',
      'envelope_signed': 'envelope_signed',
      'envelope_completed': 'envelope_completed',
      'envelope_declined': 'envelope_declined',
      'envelope_expired': 'envelope_expired',
      'comment_added': 'comment_added',
      'user_invited': 'user_invited',
      'payment_success': 'payment_success',
      'payment_failed': 'payment_failed'
    };

    const preferenceKey = notificationTypeMap[type];
    if (preferenceKey && userPreferences[preferenceKey] === false) {
      // User has opted out of this notification type
      return null;
    }

    // Create notification
    const [notificationId] = await db('notifications').insert({
      id: uuidv4(),
      user_id,
      type,
      title,
      message,
      metadata: JSON.stringify(metadata),
      read: false
    }).returning('id');

    // Send email notification if enabled
    if (send_email && user.email_notifications) {
      await sendNotificationEmail(user.email, {
        title,
        message,
        type,
        metadata
      });
    }

    // Send SMS notification if enabled
    if (send_sms && user.sms_notifications && user.phone) {
      // Check SMS credits
      const smsCredits = await checkSmsCredits(user.org_id);
      
      if (smsCredits.sufficient) {
        // Send SMS
        await sendSMS(user.phone, message, {
          orgId: user.org_id,
          userId: user_id,
          purpose: 'notification',
          metadata: {
            notification_id: notificationId,
            notification_type: type
          }
        });
        
        // Deduct SMS credits
        await deductSmsCredits(user.org_id);
      }
    }

    return notificationId;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * @desc    Send envelope notification to users
 * @param {string} envelopeId - Envelope ID
 * @param {string} type - Notification type
 * @param {Object} data - Notification data
 * @returns {Promise<Array>} - Array of notification IDs
 */
const sendEnvelopeNotification = async (envelopeId, type, data = {}) => {
  try {
    // Get envelope
    const envelope = await db('envelopes')
      .where('id', envelopeId)
      .first();

    if (!envelope) {
      throw new Error(`Envelope not found: ${envelopeId}`);
    }

    // Get organization users
    const users = await db('users')
      .where('org_id', envelope.org_id)
      .where('active', true)
      .select('id', 'first_name', 'last_name');

    // Prepare notification data
    const { title, message, signer_name, signer_email } = data;
    const notificationTitle = title || `Envelope ${type.replace('_', ' ')}`;
    const notificationMessage = message || `Envelope "${envelope.name}" has been ${type.replace('_', ' ')}`;

    // Send notifications to all users
    const notificationIds = [];
    for (const user of users) {
      const notificationId = await createNotification({
        user_id: user.id,
        type,
        title: notificationTitle,
        message: notificationMessage,
        metadata: {
          envelope_id: envelopeId,
          envelope_name: envelope.name,
          signer_name,
          signer_email
        },
        send_email: true,
        send_sms: type === 'envelope_completed' || type === 'envelope_declined'
      });

      if (notificationId) {
        notificationIds.push(notificationId);
      }
    }

    return notificationIds;
  } catch (error) {
    console.error('Error sending envelope notification:', error);
    throw error;
  }
};

/**
 * @desc    Send user invitation notification
 * @param {string} invitedUserId - Invited user ID
 * @param {string} invitedByUserId - User who sent the invitation
 * @param {string} orgId - Organization ID
 * @returns {Promise<string>} - Notification ID
 */
const sendInvitationNotification = async (invitedUserId, invitedByUserId, orgId) => {
  try {
    // Get users
    const invitedUser = await db('users')
      .where('id', invitedUserId)
      .first();

    const invitedByUser = await db('users')
      .where('id', invitedByUserId)
      .first();

    const organization = await db('organizations')
      .where('id', orgId)
      .first();

    if (!invitedUser || !invitedByUser || !organization) {
      throw new Error('User or organization not found');
    }

    // Create notification
    const notificationId = await createNotification({
      user_id: invitedUserId,
      type: 'user_invited',
      title: 'Organization Invitation',
      message: `You have been invited to join ${organization.name} by ${invitedByUser.first_name} ${invitedByUser.last_name}`,
      metadata: {
        org_id: orgId,
        org_name: organization.name,
        invited_by: {
          id: invitedByUserId,
          name: `${invitedByUser.first_name} ${invitedByUser.last_name}`
        }
      },
      send_email: true
    });

    return notificationId;
  } catch (error) {
    console.error('Error sending invitation notification:', error);
    throw error;
  }
};

/**
 * @desc    Send payment notification
 * @param {string} userId - User ID
 * @param {string} type - Notification type (payment_success or payment_failed)
 * @param {Object} paymentData - Payment data
 * @returns {Promise<string>} - Notification ID
 */
const sendPaymentNotification = async (userId, type, paymentData) => {
  try {
    // Get user
    const user = await db('users')
      .where('id', userId)
      .first();

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Prepare notification data
    const { amount, currency, payment_method, payment_type, subscription_plan } = paymentData;
    
    let title, message;
    if (type === 'payment_success') {
      title = 'Payment Successful';
      if (payment_type === 'subscription') {
        message = `Your subscription payment of ${currency} ${amount/100} for the ${subscription_plan} plan was successful`;
      } else if (payment_type === 'sms_topup') {
        message = `Your payment of ${currency} ${amount/100} for SMS credits was successful`;
      } else {
        message = `Your payment of ${currency} ${amount/100} was successful`;
      }
    } else {
      title = 'Payment Failed';
      if (payment_type === 'subscription') {
        message = `Your subscription payment of ${currency} ${amount/100} for the ${subscription_plan} plan failed`;
      } else if (payment_type === 'sms_topup') {
        message = `Your payment of ${currency} ${amount/100} for SMS credits failed`;
      } else {
        message = `Your payment of ${currency} ${amount/100} failed`;
      }
    }

    // Create notification
    const notificationId = await createNotification({
      user_id: userId,
      type,
      title,
      message,
      metadata: {
        ...paymentData
      },
      send_email: true
    });

    return notificationId;
  } catch (error) {
    console.error('Error sending payment notification:', error);
    throw error;
  }
};

module.exports = {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
  getNotificationSettings,
  updateNotificationSettings,
  getUnreadCount,
  createNotification,
  sendEnvelopeNotification,
  sendInvitationNotification,
  sendPaymentNotification
};
