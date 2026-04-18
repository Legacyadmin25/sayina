const { db } = require('../config/db');
const { ApiError } = require('../middleware/errorMiddleware');
const { processPaymentNotification, validateSignature } = require('../services/paymentService');

/**
 * @desc    Handle PayFast payment notifications (ITN)
 * @route   POST /api/v1/webhooks/payfast
 * @access  Public
 */
const handlePayfastWebhook = async (req, res, next) => {
  try {
    // Validate PayFast source IP
    const requestIP = req.ip.replace(/^::ffff:/, ''); // Normalize IPv4-mapped IPv6
    const ipParts = requestIP.split('.').map(Number);
    const ipNum = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
    // PayFast IP ranges: 197.97.145.144/28 and 41.74.179.192/27
    const payfastRanges = [
      { start: (197 << 24) + (97 << 16) + (145 << 8) + 144, end: (197 << 24) + (97 << 16) + (145 << 8) + 159 },
      { start: (41 << 24) + (74 << 16) + (179 << 8) + 192, end: (41 << 24) + (74 << 16) + (179 << 8) + 223 }
    ];
    const isValidIP = payfastRanges.some(range => ipNum >= range.start && ipNum <= range.end);
    if (!isValidIP) {
      console.error(`PayFast webhook rejected: untrusted IP ${requestIP}`);
      return res.status(403).send('Forbidden');
    }

    const data = req.body;

    // Basic validation
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).send('No data received');
    }

    // Log webhook event (omit sensitive payment details in production)
    console.log('PayFast webhook received:', data.m_payment_id || 'unknown');

    // Validate signature
    if (!validateSignature(data)) {
      console.error('Invalid PayFast signature');
      return res.status(400).send('Invalid signature');
    }

    // Process payment notification
    const result = await processPaymentNotification(data);

    if (!result.success) {
      console.error('Failed to process PayFast notification:', result.message);
      return res.status(400).send(result.message);
    }

    // Log webhook event
    await db('system_logs').insert({
      action: 'payfast_webhook_received',
      metadata: JSON.stringify({
        payment_status: data.payment_status,
        m_payment_id: data.m_payment_id,
        pf_payment_id: data.pf_payment_id,
        item_name: data.item_name,
        amount_gross: data.amount_gross,
        custom_str1: data.custom_str1,
        custom_str2: data.custom_str2
      })
    });

    // Return 200 OK to acknowledge receipt
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling PayFast webhook:', error);
    
    // Always return 200 OK to PayFast to prevent retries
    res.status(200).send('OK');
    
    // Log the error
    try {
      await db('system_logs').insert({
        action: 'payfast_webhook_error',
        metadata: JSON.stringify({
          error: error.message,
          stack: error.stack
        })
      });
    } catch (logError) {
      console.error('Failed to log PayFast webhook error:', logError);
    }
  }
};

/**
 * @desc    Handle BulkSMS delivery status updates
 * @route   POST /api/v1/webhooks/bulksms
 * @access  Public
 */
const handleBulkSmsWebhook = async (req, res, next) => {
  try {
    const data = req.body;

    // Basic validation
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).send('No data received');
    }

    // Log webhook event (omit recipient details)
    console.log('BulkSMS webhook received:', data.id || 'unknown', data.status || 'unknown');

    // Extract delivery status
    const { id, status, to, error } = data;

    if (!id || !status) {
      return res.status(400).send('Missing required fields');
    }

    // Log delivery status
    await db('system_logs').insert({
      action: 'bulksms_status_update',
      metadata: JSON.stringify({
        message_id: id,
        status,
        recipient: to,
        error: error || null
      })
    });

    // Return 200 OK to acknowledge receipt
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling BulkSMS webhook:', error);
    
    // Always return 200 OK to BulkSMS to prevent retries
    res.status(200).send('OK');
    
    // Log the error
    try {
      await db('system_logs').insert({
        action: 'bulksms_webhook_error',
        metadata: JSON.stringify({
          error: error.message,
          stack: error.stack
        })
      });
    } catch (logError) {
      console.error('Failed to log BulkSMS webhook error:', logError);
    }
  }
};

module.exports = {
  handlePayfastWebhook,
  handleBulkSmsWebhook
};
