const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { ApiError } = require('../middleware/errorMiddleware');
const { db } = require('../config/db');
const { logSecurityEvent } = require('../services/loggerService');

/**
 * Generate a secure random token
 * @param {number} length - Token length in bytes
 * @returns {string} - Hex-encoded token
 */
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash a password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>} - True if password matches
 */
const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * Generate a one-time password (OTP)
 * @param {number} length - OTP length
 * @returns {string} - OTP
 */
const generateOTP = (length = 6) => {
  // Generate a cryptographically secure random number with specified length
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return crypto.randomInt(min, max + 1).toString();
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - Validation result
 */
const validatePasswordStrength = (password) => {
  // Minimum length check
  if (password.length < 8) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters long'
    };
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter'
    };
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one lowercase letter'
    };
  }

  // Check for number
  if (!/\d/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one number'
    };
  }

  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one special character'
    };
  }

  return {
    valid: true,
    message: 'Password meets strength requirements'
  };
};

/**
 * Record a failed login attempt
 * @param {string} email - User email
 * @param {string} ipAddress - IP address
 * @param {string} userAgent - User agent
 * @returns {Promise<void>}
 */
const recordFailedLoginAttempt = async (email, ipAddress, userAgent) => {
  try {
    // Get user ID if user exists
    const user = await db('users').where('email', email).first();
    const userId = user ? user.id : null;

    // Record failed login attempt
    await db('security_events').insert({
      user_id: userId,
      event_type: 'failed_login',
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: JSON.stringify({
        email,
        timestamp: new Date().toISOString()
      })
    });

    // Log security event
    await logSecurityEvent({
      user_id: userId,
      event_type: 'failed_login',
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: {
        email
      }
    });
  } catch (error) {
    console.error('Error recording failed login attempt:', error);
  }
};

/**
 * Check if account is locked due to too many failed login attempts
 * @param {string} email - User email
 * @returns {Promise<boolean>} - True if account is locked
 */
const isAccountLocked = async (email) => {
  try {
    // Get user ID if user exists
    const user = await db('users').where('email', email).first();
    
    if (!user) {
      return false;
    }

    // Check for account lock setting
    if (user.account_locked) {
      return true;
    }

    // Check for too many failed login attempts
    const failedAttempts = await db('security_events')
      .where('user_id', user.id)
      .where('event_type', 'failed_login')
      .where('created_at', '>', db.raw("NOW() - INTERVAL '30 minutes'"))
      .count('id as count')
      .first();

    // Lock account if more than 5 failed attempts in the last 30 minutes
    if (failedAttempts.count >= 5) {
      // Update user record
      await db('users')
        .where('id', user.id)
        .update({
          account_locked: true,
          account_locked_at: new Date()
        });

      // Log security event
      await logSecurityEvent({
        user_id: user.id,
        event_type: 'account_locked',
        metadata: {
          reason: 'Too many failed login attempts'
        }
      });

      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking if account is locked:', error);
    return false;
  }
};

/**
 * Unlock a locked account
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - True if account was unlocked
 */
const unlockAccount = async (userId) => {
  try {
    // Check if user exists
    const user = await db('users').where('id', userId).first();
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Check if account is locked
    if (!user.account_locked) {
      return {
        success: true,
        message: 'Account is not locked'
      };
    }

    // Unlock account
    await db('users')
      .where('id', userId)
      .update({
        account_locked: false,
        account_locked_at: null
      });

    // Log security event
    await logSecurityEvent({
      user_id: userId,
      event_type: 'account_unlocked',
      metadata: {
        timestamp: new Date().toISOString()
      }
    });

    return {
      success: true,
      message: 'Account unlocked successfully'
    };
  } catch (error) {
    console.error('Error unlocking account:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to unlock account');
  }
};

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input - User input
 * @returns {string} - Sanitized input
 */
const sanitizeInput = (input) => {
  if (!input) {
    return input;
  }
  
  // Replace potentially dangerous characters
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate a CSRF token
 * @param {string} token - CSRF token from request
 * @param {string} sessionToken - CSRF token from session
 * @returns {boolean} - True if token is valid
 */
const validateCSRFToken = (token, sessionToken) => {
  return token === sessionToken;
};

/**
 * Generate a CSRF token
 * @returns {string} - CSRF token
 */
const generateCSRFToken = () => {
  return generateSecureToken(16);
};

/**
 * Check if IP address is suspicious (e.g., known proxy or VPN)
 * @param {string} ipAddress - IP address to check
 * @returns {Promise<boolean>} - True if IP is suspicious
 */
const isSuspiciousIP = async (ipAddress) => {
  // This would typically involve checking against a database or API
  // For now, we'll return false
  return false;
};

/**
 * Record a security event
 * @param {Object} eventData - Event data
 * @returns {Promise<string>} - Event ID
 */
const recordSecurityEvent = async (eventData) => {
  try {
    const {
      user_id = null,
      event_type,
      ip_address = null,
      user_agent = null,
      metadata = {}
    } = eventData;

    // Validate required fields
    if (!event_type) {
      throw new Error('Event type is required');
    }

    // Record event
    const [eventId] = await db('security_events').insert({
      user_id,
      event_type,
      ip_address,
      user_agent,
      metadata: JSON.stringify(metadata)
    }).returning('id');

    return eventId;
  } catch (error) {
    console.error('Error recording security event:', error);
    throw new Error('Failed to record security event');
  }
};

module.exports = {
  generateSecureToken,
  hashPassword,
  comparePassword,
  generateOTP,
  validatePasswordStrength,
  recordFailedLoginAttempt,
  isAccountLocked,
  unlockAccount,
  sanitizeInput,
  validateCSRFToken,
  generateCSRFToken,
  isSuspiciousIP,
  recordSecurityEvent
};
