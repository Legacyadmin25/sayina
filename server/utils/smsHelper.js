const axios = require('axios');
const { logSmsEvent } = require('../services/loggerService');

/**
 * Send SMS using BulkSMS API
 * @param {string} to - Recipient phone number
 * @param {string} message - SMS message
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - SMS sending result
 */
const sendSMS = async (to, message, options = {}) => {
  try {
    const {
      orgId = null,
      userId = null,
      purpose = 'general',
      metadata = {}
    } = options;

    // Format phone number (ensure it starts with +27 for South Africa)
    let formattedNumber = to;
    if (to.startsWith('0')) {
      formattedNumber = `+27${to.substring(1)}`;
    }

    // BulkSMS API credentials
    const username = process.env.BULKSMS_USERNAME;
    const password = process.env.BULKSMS_API_KEY;

    // BulkSMS API endpoint
    const apiUrl = 'https://api.bulksms.com/v1/messages';

    // Request body
    const requestBody = {
      to: formattedNumber,
      body: message,
      encoding: 'UNICODE',
      delivery_report: 'FULL'
    };

    // Make API request
    const response = await axios.post(apiUrl, requestBody, {
      auth: {
        username,
        password
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Log SMS event
    if (orgId) {
      await logSmsEvent({
        org_id: orgId,
        user_id: userId,
        recipient: formattedNumber,
        message_id: response.data.id,
        status: 'sent',
        count: calculateSmsCount(message),
        purpose,
        metadata
      });
    }

    return {
      success: true,
      messageId: response.data.id,
      status: response.data.status,
      remaining: response.data.credits_remaining
    };
  } catch (error) {
    console.error('Error sending SMS:', error);

    // Log SMS event failure
    if (options.orgId) {
      await logSmsEvent({
        org_id: options.orgId,
        user_id: options.userId,
        recipient: to,
        message_id: null,
        status: 'failed',
        count: calculateSmsCount(message),
        purpose: options.purpose,
        metadata: {
          ...options.metadata,
          error: error.message
        }
      });
    }

    return {
      success: false,
      error: error.message || 'Failed to send SMS'
    };
  }
};

/**
 * Calculate SMS count based on message length
 * @param {string} message - SMS message
 * @returns {number} - SMS count
 */
const calculateSmsCount = (message) => {
  // Check if message contains non-GSM characters
  const hasUnicode = /[^\u0000-\u007F]/.test(message);
  
  // GSM character limit per SMS
  const charLimit = hasUnicode ? 70 : 160;
  
  // Multi-part SMS character limit
  const multipartLimit = hasUnicode ? 67 : 153;
  
  // Calculate SMS count
  const messageLength = message.length;
  
  if (messageLength <= charLimit) {
    return 1;
  } else {
    return Math.ceil(messageLength / multipartLimit);
  }
};

/**
 * Check SMS credit balance
 * @returns {Promise<Object>} - SMS credit balance
 */
const checkSmsBalance = async () => {
  try {
    // BulkSMS API credentials
    const username = process.env.BULKSMS_USERNAME;
    const password = process.env.BULKSMS_API_KEY;

    // BulkSMS API endpoint
    const apiUrl = 'https://api.bulksms.com/v1/profile';

    // Make API request
    const response = await axios.get(apiUrl, {
      auth: {
        username,
        password
      }
    });

    return {
      success: true,
      credits: response.data.credits
    };
  } catch (error) {
    console.error('Error checking SMS balance:', error);
    return {
      success: false,
      error: error.message || 'Failed to check SMS balance'
    };
  }
};

/**
 * Format phone number to international format
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} - Formatted phone number
 */
const formatPhoneNumber = (phoneNumber) => {
  // Remove any non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Handle South African numbers
  if (cleaned.startsWith('0')) {
    return `+27${cleaned.substring(1)}`;
  }
  
  // If already in international format
  if (cleaned.startsWith('27')) {
    return `+${cleaned}`;
  }
  
  // If already has plus sign
  if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }
  
  // Default to South African number if no country code
  return `+27${cleaned}`;
};

/**
 * Validate South African phone number
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} - True if valid South African phone number
 */
const isValidSAPhoneNumber = (phoneNumber) => {
  // South African phone number regex
  const saPhoneRegex = /^(\+27|0)[6-8][0-9]{8}$/;
  return saPhoneRegex.test(phoneNumber);
};

module.exports = {
  sendSMS,
  calculateSmsCount,
  checkSmsBalance,
  formatPhoneNumber,
  isValidSAPhoneNumber
};
