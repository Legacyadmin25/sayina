const { db } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { sendEmail } = require('./emailService');

/**
 * Create a notification for a user
 * @param {string} userId - User ID
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<string>} - Notification ID
 */
const createNotification = async (userId, type, title, message, metadata = {}) => {
  try {
    // Create notification
    const [notificationId] = await db('notifications').insert({
      id: uuidv4(),
      user_id: userId,
      type,
      title,
      message,
      metadata: JSON.stringify(metadata),
      is_read: false
    }).returning('id');
    
    return notificationId;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw new Error('Failed to create notification');
  }
};

/**
 * Create notifications for multiple users
 * @param {Array} userIds - Array of user IDs
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Array>} - Array of notification IDs
 */
const createNotifications = async (userIds, type, title, message, metadata = {}) => {
  try {
    const notificationIds = [];
    
    // Create notifications in batches
    for (const userId of userIds) {
      const notificationId = await createNotification(userId, type, title, message, metadata);
      notificationIds.push(notificationId);
    }
    
    return notificationIds;
  } catch (error) {
    console.error('Error creating notifications:', error);
    throw new Error('Failed to create notifications');
  }
};

/**
 * Create envelope status notification
 * @param {string} envelopeId - Envelope ID
 * @param {string} status - Envelope status
 * @returns {Promise<Array>} - Array of notification IDs
 */
const createEnvelopeStatusNotification = async (envelopeId, status) => {
  try {
    // Get envelope details
    const envelope = await db('envelopes')
      .where({ id: envelopeId })
      .first();
    
    if (!envelope) {
      throw new Error('Envelope not found');
    }
    
    // Get users to notify (organization members)
    const users = await db('users')
      .where({ org_id: envelope.org_id, is_active: true })
      .select('id', 'email', 'first_name', 'last_name');
    
    if (users.length === 0) {
      return [];
    }
    
    // Create notification title and message based on status
    let title, message;
    
    switch (status) {
      case 'sent':
        title = 'Envelope Sent';
        message = `Envelope "${envelope.name}" has been sent to signers.`;
        break;
      case 'delivered':
        title = 'Envelope Delivered';
        message = `Envelope "${envelope.name}" has been delivered to all signers.`;
        break;
      case 'partially_signed':
        title = 'Envelope Partially Signed';
        message = `Envelope "${envelope.name}" has been partially signed.`;
        break;
      case 'completed':
        title = 'Envelope Completed';
        message = `Envelope "${envelope.name}" has been completed. All signers have signed.`;
        break;
      case 'declined':
        title = 'Envelope Declined';
        message = `Envelope "${envelope.name}" has been declined by a signer.`;
        break;
      case 'expired':
        title = 'Envelope Expired';
        message = `Envelope "${envelope.name}" has expired without being completed.`;
        break;
      case 'voided':
        title = 'Envelope Voided';
        message = `Envelope "${envelope.name}" has been voided.`;
        break;
      default:
        title = 'Envelope Status Update';
        message = `Envelope "${envelope.name}" status has been updated to ${status}.`;
    }
    
    // Create notifications for all users
    const userIds = users.map(user => user.id);
    
    return await createNotifications(
      userIds,
      'envelope_status',
      title,
      message,
      {
        envelope_id: envelopeId,
        envelope_name: envelope.name,
        status
      }
    );
  } catch (error) {
    console.error('Error creating envelope status notification:', error);
    throw new Error('Failed to create envelope status notification');
  }
};

/**
 * Create signer action notification
 * @param {string} signerId - Signer ID
 * @param {string} action - Signer action
 * @returns {Promise<Array>} - Array of notification IDs
 */
const createSignerActionNotification = async (signerId, action) => {
  try {
    // Get signer details
    const signer = await db('signers')
      .where({ id: signerId })
      .first();
    
    if (!signer) {
      throw new Error('Signer not found');
    }
    
    // Get envelope details
    const envelope = await db('envelopes')
      .where({ id: signer.envelope_id })
      .first();
    
    if (!envelope) {
      throw new Error('Envelope not found');
    }
    
    // Get users to notify (organization members)
    const users = await db('users')
      .where({ org_id: envelope.org_id, is_active: true })
      .select('id', 'email', 'first_name', 'last_name');
    
    if (users.length === 0) {
      return [];
    }
    
    // Create notification title and message based on action
    let title, message;
    
    switch (action) {
      case 'viewed':
        title = 'Envelope Viewed';
        message = `${signer.name} (${signer.email}) has viewed envelope "${envelope.name}".`;
        break;
      case 'signed':
        title = 'Envelope Signed';
        message = `${signer.name} (${signer.email}) has signed envelope "${envelope.name}".`;
        break;
      case 'declined':
        title = 'Envelope Declined';
        message = `${signer.name} (${signer.email}) has declined to sign envelope "${envelope.name}".`;
        break;
      default:
        title = 'Signer Action';
        message = `${signer.name} (${signer.email}) has performed action "${action}" on envelope "${envelope.name}".`;
    }
    
    // Create notifications for all users
    const userIds = users.map(user => user.id);
    
    return await createNotifications(
      userIds,
      'signer_action',
      title,
      message,
      {
        envelope_id: envelope.id,
        envelope_name: envelope.name,
        signer_id: signerId,
        signer_name: signer.name,
        signer_email: signer.email,
        action
      }
    );
  } catch (error) {
    console.error('Error creating signer action notification:', error);
    throw new Error('Failed to create signer action notification');
  }
};

/**
 * Create payment notification
 * @param {string} orgId - Organization ID
 * @param {string} type - Payment type
 * @param {string} status - Payment status
 * @param {Object} paymentData - Payment data
 * @returns {Promise<Array>} - Array of notification IDs
 */
const createPaymentNotification = async (orgId, type, status, paymentData) => {
  try {
    // Get organization details
    const organization = await db('organizations')
      .where({ id: orgId })
      .first();
    
    if (!organization) {
      throw new Error('Organization not found');
    }
    
    // Get users to notify (organization admins)
    const users = await db('users')
      .where({ org_id: orgId, role: 'org_admin', is_active: true })
      .select('id', 'email', 'first_name', 'last_name');
    
    if (users.length === 0) {
      return [];
    }
    
    // Create notification title and message based on type and status
    let title, message;
    
    if (type === 'subscription') {
      switch (status) {
        case 'completed':
          title = 'Subscription Payment Successful';
          message = `Your subscription payment of ${paymentData.currency} ${paymentData.amount} has been successfully processed.`;
          break;
        case 'failed':
          title = 'Subscription Payment Failed';
          message = `Your subscription payment of ${paymentData.currency} ${paymentData.amount} has failed. Please update your payment method.`;
          break;
        case 'cancelled':
          title = 'Subscription Cancelled';
          message = 'Your subscription has been cancelled.';
          break;
        default:
          title = 'Subscription Update';
          message = `Your subscription status has been updated to ${status}.`;
      }
    } else if (type === 'sms_topup') {
      switch (status) {
        case 'completed':
          title = 'SMS Credits Top-up Successful';
          message = `Your SMS credits top-up of ${paymentData.credits} credits for ${paymentData.currency} ${paymentData.amount} has been successfully processed.`;
          break;
        case 'failed':
          title = 'SMS Credits Top-up Failed';
          message = `Your SMS credits top-up payment of ${paymentData.currency} ${paymentData.amount} has failed.`;
          break;
        default:
          title = 'SMS Credits Top-up Update';
          message = `Your SMS credits top-up status has been updated to ${status}.`;
      }
    } else {
      title = 'Payment Update';
      message = `Your payment status has been updated to ${status}.`;
    }
    
    // Create notifications for all users
    const userIds = users.map(user => user.id);
    
    return await createNotifications(
      userIds,
      'payment',
      title,
      message,
      {
        org_id: orgId,
        payment_type: type,
        payment_status: status,
        payment_data: paymentData
      }
    );
  } catch (error) {
    console.error('Error creating payment notification:', error);
    throw new Error('Failed to create payment notification');
  }
};

/**
 * Create user invitation notification
 * @param {string} inviterId - Inviter user ID
 * @param {string} invitedUserId - Invited user ID
 * @returns {Promise<string>} - Notification ID
 */
const createUserInvitationNotification = async (inviterId, invitedUserId) => {
  try {
    // Get inviter details
    const inviter = await db('users')
      .where({ id: inviterId })
      .first();
    
    if (!inviter) {
      throw new Error('Inviter not found');
    }
    
    // Get invited user details
    const invitedUser = await db('users')
      .where({ id: invitedUserId })
      .first();
    
    if (!invitedUser) {
      throw new Error('Invited user not found');
    }
    
    // Get organization details
    const organization = await db('organizations')
      .where({ id: invitedUser.org_id })
      .first();
    
    if (!organization) {
      throw new Error('Organization not found');
    }
    
    // Create notification
    const title = 'Welcome to Sayina';
    const message = `You have been invited to join ${organization.name} by ${inviter.first_name} ${inviter.last_name}.`;
    
    return await createNotification(
      invitedUserId,
      'user_invitation',
      title,
      message,
      {
        inviter_id: inviterId,
        inviter_name: `${inviter.first_name} ${inviter.last_name}`,
        org_id: organization.id,
        org_name: organization.name
      }
    );
  } catch (error) {
    console.error('Error creating user invitation notification:', error);
    throw new Error('Failed to create user invitation notification');
  }
};

/**
 * Create system notification
 * @param {string} orgId - Organization ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Array>} - Array of notification IDs
 */
const createSystemNotification = async (orgId, title, message, metadata = {}) => {
  try {
    // Get users to notify (organization members)
    const users = await db('users')
      .where({ org_id: orgId, is_active: true })
      .select('id');
    
    if (users.length === 0) {
      return [];
    }
    
    // Create notifications for all users
    const userIds = users.map(user => user.id);
    
    return await createNotifications(
      userIds,
      'system',
      title,
      message,
      metadata
    );
  } catch (error) {
    console.error('Error creating system notification:', error);
    throw new Error('Failed to create system notification');
  }
};

module.exports = {
  createNotification,
  createNotifications,
  createEnvelopeStatusNotification,
  createSignerActionNotification,
  createPaymentNotification,
  createUserInvitationNotification,
  createSystemNotification
};
