const crypto = require('crypto');
const querystring = require('querystring');
const axios = require('axios');

/**
 * Generate PayFast signature
 * @param {Object} data - Payment data
 * @param {string} passphrase - PayFast passphrase
 * @returns {string} - Generated signature
 */
const generateSignature = (data, passphrase = null) => {
  // Create parameter string
  let pfOutput = '';
  for (let key in data) {
    if (data.hasOwnProperty(key)) {
      if (data[key] !== '') {
        pfOutput += `${key}=${encodeURIComponent(data[key]).replace(/%20/g, '+')}&`;
      }
    }
  }

  // Remove last ampersand
  pfOutput = pfOutput.slice(0, -1);

  // Add passphrase if provided
  if (passphrase !== null) {
    pfOutput += `&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`;
  }

  // Generate signature
  return crypto.createHash('md5').update(pfOutput).digest('hex');
};

/**
 * Validate PayFast signature
 * @param {Object} data - Payment data
 * @returns {boolean} - True if signature is valid
 */
const validateSignature = (data) => {
  // Get signature from data
  const receivedSignature = data.signature;
  delete data.signature;

  // Generate signature
  const generatedSignature = generateSignature(data, process.env.PAYFAST_PASSPHRASE);

  // Compare signatures
  return receivedSignature === generatedSignature;
};

/**
 * Generate PayFast payment URL for once-off payment
 * @param {Object} paymentData - Payment data
 * @returns {string} - Payment URL
 */
const generatePaymentUrl = (paymentData) => {
  // Set PayFast merchant details
  const pfData = {
    merchant_id: process.env.PAYFAST_MERCHANT_ID,
    merchant_key: process.env.PAYFAST_MERCHANT_KEY,
    return_url: paymentData.returnUrl,
    cancel_url: paymentData.cancelUrl,
    notify_url: paymentData.notifyUrl,
    name_first: paymentData.firstName,
    name_last: paymentData.lastName,
    email_address: paymentData.email,
    m_payment_id: paymentData.merchantPaymentId || '',
    amount: paymentData.amount.toFixed(2),
    item_name: paymentData.itemName,
    item_description: paymentData.itemDescription || '',
    custom_str1: paymentData.customStr1 || '',
    custom_str2: paymentData.customStr2 || '',
    custom_str3: paymentData.customStr3 || '',
    custom_str4: paymentData.customStr4 || '',
    custom_str5: paymentData.customStr5 || '',
    custom_int1: paymentData.customInt1 || '',
    custom_int2: paymentData.customInt2 || '',
    custom_int3: paymentData.customInt3 || '',
    custom_int4: paymentData.customInt4 || '',
    custom_int5: paymentData.customInt5 || '',
    email_confirmation: paymentData.emailConfirmation ? '1' : '0',
    confirmation_address: paymentData.confirmationAddress || ''
  };

  // Generate signature
  pfData.signature = generateSignature(pfData, process.env.PAYFAST_PASSPHRASE);

  // Build payment URL
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://www.payfast.co.za/eng/process'
    : 'https://sandbox.payfast.co.za/eng/process';

  return `${baseUrl}?${querystring.stringify(pfData)}`;
};

/**
 * Generate PayFast payment URL for subscription
 * @param {Object} subscriptionData - Subscription data
 * @returns {string} - Payment URL
 */
const generateSubscriptionUrl = (subscriptionData) => {
  // Set PayFast merchant details
  const pfData = {
    merchant_id: process.env.PAYFAST_MERCHANT_ID,
    merchant_key: process.env.PAYFAST_MERCHANT_KEY,
    return_url: subscriptionData.returnUrl,
    cancel_url: subscriptionData.cancelUrl,
    notify_url: subscriptionData.notifyUrl,
    name_first: subscriptionData.firstName,
    name_last: subscriptionData.lastName,
    email_address: subscriptionData.email,
    m_payment_id: subscriptionData.merchantPaymentId || '',
    amount: subscriptionData.amount.toFixed(2),
    item_name: subscriptionData.itemName,
    item_description: subscriptionData.itemDescription || '',
    custom_str1: subscriptionData.customStr1 || '',
    custom_str2: subscriptionData.customStr2 || '',
    custom_str3: subscriptionData.customStr3 || '',
    custom_str4: subscriptionData.customStr4 || '',
    custom_str5: subscriptionData.customStr5 || '',
    custom_int1: subscriptionData.customInt1 || '',
    custom_int2: subscriptionData.customInt2 || '',
    custom_int3: subscriptionData.customInt3 || '',
    custom_int4: subscriptionData.customInt4 || '',
    custom_int5: subscriptionData.customInt5 || '',
    email_confirmation: subscriptionData.emailConfirmation ? '1' : '0',
    confirmation_address: subscriptionData.confirmationAddress || '',
    subscription_type: '1', // Recurring subscription
    billing_date: subscriptionData.billingDate || '',
    recurring_amount: subscriptionData.recurringAmount || subscriptionData.amount.toFixed(2),
    frequency: subscriptionData.frequency || '3', // 3 = Monthly
    cycles: subscriptionData.cycles || '0' // 0 = Indefinite
  };

  // Generate signature
  pfData.signature = generateSignature(pfData, process.env.PAYFAST_PASSPHRASE);

  // Build payment URL
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://www.payfast.co.za/eng/process'
    : 'https://sandbox.payfast.co.za/eng/process';

  return `${baseUrl}?${querystring.stringify(pfData)}`;
};

/**
 * Fetch subscription details from PayFast
 * @param {string} token - Subscription token
 * @returns {Promise<Object>} - Subscription details
 */
const fetchSubscription = async (token) => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const pfData = {
      merchant_id: process.env.PAYFAST_MERCHANT_ID,
      version: 'v1',
      timestamp: timestamp,
      token: token
    };

    // Generate signature
    pfData.signature = generateSignature(pfData, process.env.PAYFAST_PASSPHRASE);

    // API URL
    const apiUrl = process.env.NODE_ENV === 'production'
      ? 'https://api.payfast.co.za/subscriptions/fetch'
      : 'https://sandbox.payfast.co.za/subscriptions/fetch';

    // Make API request
    const response = await axios.post(apiUrl, pfData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.data.status === 'success') {
      return {
        success: true,
        subscription: response.data.data
      };
    } else {
      return {
        success: false,
        error: response.data.message || 'Failed to fetch subscription'
      };
    }
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch subscription'
    };
  }
};

/**
 * Cancel subscription with PayFast
 * @param {string} token - Subscription token
 * @returns {Promise<Object>} - Cancellation result
 */
const cancelSubscription = async (token) => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const pfData = {
      merchant_id: process.env.PAYFAST_MERCHANT_ID,
      version: 'v1',
      timestamp: timestamp,
      token: token
    };

    // Generate signature
    pfData.signature = generateSignature(pfData, process.env.PAYFAST_PASSPHRASE);

    // API URL
    const apiUrl = process.env.NODE_ENV === 'production'
      ? 'https://api.payfast.co.za/subscriptions/cancel'
      : 'https://sandbox.payfast.co.za/subscriptions/cancel';

    // Make API request
    const response = await axios.post(apiUrl, pfData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.data.status === 'success') {
      return {
        success: true,
        message: response.data.message || 'Subscription cancelled successfully'
      };
    } else {
      return {
        success: false,
        error: response.data.message || 'Failed to cancel subscription'
      };
    }
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return {
      success: false,
      error: error.message || 'Failed to cancel subscription'
    };
  }
};

/**
 * Update subscription with PayFast
 * @param {string} token - Subscription token
 * @param {Object} updateData - Update data
 * @returns {Promise<Object>} - Update result
 */
const updateSubscription = async (token, updateData) => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const pfData = {
      merchant_id: process.env.PAYFAST_MERCHANT_ID,
      version: 'v1',
      timestamp: timestamp,
      token: token
    };

    // Add update data
    if (updateData.amount) {
      pfData.amount = updateData.amount.toFixed(2);
    }
    if (updateData.cycles) {
      pfData.cycles = updateData.cycles;
    }
    if (updateData.frequency) {
      pfData.frequency = updateData.frequency;
    }
    if (updateData.runDate) {
      pfData.run_date = updateData.runDate;
    }

    // Generate signature
    pfData.signature = generateSignature(pfData, process.env.PAYFAST_PASSPHRASE);

    // API URL
    const apiUrl = process.env.NODE_ENV === 'production'
      ? 'https://api.payfast.co.za/subscriptions/update'
      : 'https://sandbox.payfast.co.za/subscriptions/update';

    // Make API request
    const response = await axios.post(apiUrl, pfData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.data.status === 'success') {
      return {
        success: true,
        message: response.data.message || 'Subscription updated successfully'
      };
    } else {
      return {
        success: false,
        error: response.data.message || 'Failed to update subscription'
      };
    }
  } catch (error) {
    console.error('Error updating subscription:', error);
    return {
      success: false,
      error: error.message || 'Failed to update subscription'
    };
  }
};

/**
 * Pause subscription with PayFast
 * @param {string} token - Subscription token
 * @param {string} cyclesPaused - Number of cycles to pause
 * @returns {Promise<Object>} - Pause result
 */
const pauseSubscription = async (token, cyclesPaused = '1') => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const pfData = {
      merchant_id: process.env.PAYFAST_MERCHANT_ID,
      version: 'v1',
      timestamp: timestamp,
      token: token,
      cycles: cyclesPaused
    };

    // Generate signature
    pfData.signature = generateSignature(pfData, process.env.PAYFAST_PASSPHRASE);

    // API URL
    const apiUrl = process.env.NODE_ENV === 'production'
      ? 'https://api.payfast.co.za/subscriptions/pause'
      : 'https://sandbox.payfast.co.za/subscriptions/pause';

    // Make API request
    const response = await axios.post(apiUrl, pfData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.data.status === 'success') {
      return {
        success: true,
        message: response.data.message || 'Subscription paused successfully'
      };
    } else {
      return {
        success: false,
        error: response.data.message || 'Failed to pause subscription'
      };
    }
  } catch (error) {
    console.error('Error pausing subscription:', error);
    return {
      success: false,
      error: error.message || 'Failed to pause subscription'
    };
  }
};

/**
 * Unpause subscription with PayFast
 * @param {string} token - Subscription token
 * @returns {Promise<Object>} - Unpause result
 */
const unpauseSubscription = async (token) => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const pfData = {
      merchant_id: process.env.PAYFAST_MERCHANT_ID,
      version: 'v1',
      timestamp: timestamp,
      token: token
    };

    // Generate signature
    pfData.signature = generateSignature(pfData, process.env.PAYFAST_PASSPHRASE);

    // API URL
    const apiUrl = process.env.NODE_ENV === 'production'
      ? 'https://api.payfast.co.za/subscriptions/unpause'
      : 'https://sandbox.payfast.co.za/subscriptions/unpause';

    // Make API request
    const response = await axios.post(apiUrl, pfData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.data.status === 'success') {
      return {
        success: true,
        message: response.data.message || 'Subscription unpaused successfully'
      };
    } else {
      return {
        success: false,
        error: response.data.message || 'Failed to unpause subscription'
      };
    }
  } catch (error) {
    console.error('Error unpausing subscription:', error);
    return {
      success: false,
      error: error.message || 'Failed to unpause subscription'
    };
  }
};

/**
 * Verify PayFast payment notification
 * @param {Object} pfData - PayFast notification data
 * @returns {Promise<Object>} - Verification result
 */
const verifyPaymentNotification = async (pfData) => {
  try {
    // Verify signature
    if (!validateSignature(pfData)) {
      return {
        success: false,
        message: 'Invalid signature'
      };
    }

    // Verify merchant ID
    if (pfData.merchant_id !== process.env.PAYFAST_MERCHANT_ID) {
      return {
        success: false,
        message: 'Invalid merchant ID'
      };
    }

    // Verify amount
    if (parseFloat(pfData.amount_gross) <= 0) {
      return {
        success: false,
        message: 'Invalid amount'
      };
    }

    // Verify payment status
    if (pfData.payment_status !== 'COMPLETE') {
      return {
        success: false,
        message: 'Payment not complete'
      };
    }

    return {
      success: true,
      message: 'Payment notification verified'
    };
  } catch (error) {
    console.error('Error verifying payment notification:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify payment notification'
    };
  }
};

module.exports = {
  generateSignature,
  validateSignature,
  generatePaymentUrl,
  generateSubscriptionUrl,
  fetchSubscription,
  cancelSubscription,
  updateSubscription,
  pauseSubscription,
  unpauseSubscription,
  verifyPaymentNotification
};
