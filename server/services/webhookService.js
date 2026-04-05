/**
 * Webhook Service
 * 
 * This service handles outgoing webhooks to notify external systems about events
 * in the Sayina E-Signature platform. It manages webhook configurations, event
 * delivery, retries, and security.
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../config/db');
const { logSystemEvent } = require('./loggerService');

/**
 * Send webhook notification to a specific endpoint
 * @param {string} webhookId - Webhook configuration ID
 * @param {string} event - Event type
 * @param {Object} payload - Event payload
 * @returns {Promise<Object>} - Delivery result
 */
const sendWebhookNotification = async (webhookId, event, payload) => {
  try {
    // Get webhook configuration
    const webhook = await db('webhooks')
      .where('id', webhookId)
      .first();
    
    if (!webhook || !webhook.active) {
      return {
        success: false,
        message: 'Webhook not found or inactive'
      };
    }
    
    // Check if webhook is subscribed to this event
    const events = JSON.parse(webhook.events || '[]');
    if (!events.includes(event) && !events.includes('*')) {
      return {
        success: false,
        message: 'Webhook not subscribed to this event'
      };
    }
    
    // Prepare delivery ID and timestamp
    const deliveryId = uuidv4();
    const timestamp = new Date().toISOString();
    
    // Prepare complete payload
    const completePayload = {
      id: deliveryId,
      timestamp,
      event,
      data: payload
    };
    
    // Sign payload if secret is configured
    let signature = null;
    if (webhook.secret) {
      signature = generateSignature(JSON.stringify(completePayload), webhook.secret);
    }
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Sayina-Webhook/1.0',
      'X-Sayina-Delivery': deliveryId,
      'X-Sayina-Event': event,
      'X-Sayina-Timestamp': timestamp
    };
    
    // Add signature if available
    if (signature) {
      headers['X-Sayina-Signature'] = signature;
    }
    
    // Record delivery attempt
    const [deliveryId2] = await db('webhook_deliveries').insert({
      id: deliveryId,
      webhook_id: webhookId,
      event,
      payload: JSON.stringify(completePayload),
      request_headers: JSON.stringify(headers),
      attempt_count: 1,
      status: 'pending'
    }).returning('id');
    
    // Send webhook
    const response = await axios({
      method: 'post',
      url: webhook.url,
      headers,
      data: completePayload,
      timeout: 10000 // 10 second timeout
    });
    
    // Update delivery record with success
    await db('webhook_deliveries')
      .where('id', deliveryId)
      .update({
        status: 'delivered',
        response_code: response.status,
        response_headers: JSON.stringify(response.headers),
        response_body: JSON.stringify(response.data),
        delivered_at: db.fn.now()
      });
    
    // Log successful delivery
    await logSystemEvent({
      action: 'webhook_delivered',
      metadata: {
        webhook_id: webhookId,
        delivery_id: deliveryId,
        event
      }
    });
    
    return {
      success: true,
      deliveryId,
      status: response.status
    };
  } catch (error) {
    // Handle delivery failure
    let errorMessage = 'Unknown error';
    let statusCode = 500;
    
    if (error.response) {
      // Server responded with non-2xx status
      statusCode = error.response.status;
      errorMessage = `Server responded with ${statusCode}`;
      
      // Update delivery record with failure
      await db('webhook_deliveries')
        .where('id', deliveryId)
        .update({
          status: 'failed',
          response_code: statusCode,
          response_headers: JSON.stringify(error.response.headers || {}),
          response_body: JSON.stringify(error.response.data || ''),
          error_message: errorMessage
        });
    } else if (error.request) {
      // Request made but no response received
      errorMessage = 'No response received from server';
      
      // Update delivery record with failure
      await db('webhook_deliveries')
        .where('id', deliveryId)
        .update({
          status: 'failed',
          error_message: errorMessage
        });
    } else {
      // Error setting up the request
      errorMessage = error.message || 'Error setting up request';
      
      // Update delivery record with failure
      await db('webhook_deliveries')
        .where('id', deliveryId)
        .update({
          status: 'failed',
          error_message: errorMessage
        });
    }
    
    // Log failed delivery
    await logSystemEvent({
      action: 'webhook_failed',
      metadata: {
        webhook_id: webhookId,
        delivery_id: deliveryId,
        event,
        error: errorMessage
      }
    });
    
    // Queue for retry if appropriate
    await queueWebhookRetry(deliveryId);
    
    return {
      success: false,
      deliveryId,
      error: errorMessage
    };
  }
};

/**
 * Generate HMAC signature for webhook payload
 * @param {string} payload - JSON payload as string
 * @param {string} secret - Webhook secret
 * @returns {string} - HMAC signature
 */
const generateSignature = (payload, secret) => {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
};

/**
 * Queue webhook for retry
 * @param {string} deliveryId - Webhook delivery ID
 * @returns {Promise<boolean>} - Success status
 */
const queueWebhookRetry = async (deliveryId) => {
  try {
    // Get delivery record
    const delivery = await db('webhook_deliveries')
      .where('id', deliveryId)
      .first();
    
    if (!delivery) {
      return false;
    }
    
    // Check if max retries reached (5 retries)
    if (delivery.attempt_count >= 6) {
      await db('webhook_deliveries')
        .where('id', deliveryId)
        .update({
          status: 'failed_permanently'
        });
      
      return false;
    }
    
    // Calculate next retry time with exponential backoff
    // 1min, 5min, 15min, 30min, 60min
    const retryDelays = [1, 5, 15, 30, 60];
    const nextRetryMinutes = retryDelays[delivery.attempt_count - 1] || 60;
    const nextRetryTime = new Date();
    nextRetryTime.setMinutes(nextRetryTime.getMinutes() + nextRetryMinutes);
    
    // Update delivery record for retry
    await db('webhook_deliveries')
      .where('id', deliveryId)
      .update({
        status: 'pending_retry',
        next_retry_at: nextRetryTime
      });
    
    return true;
  } catch (error) {
    console.error('Error queueing webhook retry:', error);
    return false;
  }
};

/**
 * Process webhook retries that are due
 * @returns {Promise<number>} - Number of retries processed
 */
const processWebhookRetries = async () => {
  try {
    // Get deliveries due for retry
    const deliveries = await db('webhook_deliveries')
      .where('status', 'pending_retry')
      .where('next_retry_at', '<=', db.fn.now())
      .limit(10);
    
    let processedCount = 0;
    
    // Process each delivery
    for (const delivery of deliveries) {
      try {
        // Get webhook configuration
        const webhook = await db('webhooks')
          .where('id', delivery.webhook_id)
          .first();
        
        if (!webhook || !webhook.active) {
          // Mark as failed permanently if webhook is gone or inactive
          await db('webhook_deliveries')
            .where('id', delivery.id)
            .update({
              status: 'failed_permanently',
              error_message: 'Webhook configuration no longer active'
            });
          
          processedCount++;
          continue;
        }
        
        // Parse payload
        const payload = JSON.parse(delivery.payload);
        
        // Prepare headers
        const headers = {
          'Content-Type': 'application/json',
          'User-Agent': 'Sayina-Webhook/1.0',
          'X-Sayina-Delivery': delivery.id,
          'X-Sayina-Event': payload.event,
          'X-Sayina-Timestamp': payload.timestamp,
          'X-Sayina-Retry-Count': delivery.attempt_count.toString()
        };
        
        // Add signature if available
        if (webhook.secret) {
          headers['X-Sayina-Signature'] = generateSignature(delivery.payload, webhook.secret);
        }
        
        // Send webhook
        const response = await axios({
          method: 'post',
          url: webhook.url,
          headers,
          data: payload,
          timeout: 10000 // 10 second timeout
        });
        
        // Update delivery record with success
        await db('webhook_deliveries')
          .where('id', delivery.id)
          .update({
            status: 'delivered',
            response_code: response.status,
            response_headers: JSON.stringify(response.headers),
            response_body: JSON.stringify(response.data),
            delivered_at: db.fn.now(),
            attempt_count: delivery.attempt_count + 1
          });
        
        // Log successful retry
        await logSystemEvent({
          action: 'webhook_retry_succeeded',
          metadata: {
            webhook_id: delivery.webhook_id,
            delivery_id: delivery.id,
            attempt: delivery.attempt_count + 1
          }
        });
      } catch (error) {
        // Handle retry failure
        let errorMessage = 'Unknown error';
        let statusCode = 500;
        
        if (error.response) {
          // Server responded with non-2xx status
          statusCode = error.response.status;
          errorMessage = `Server responded with ${statusCode}`;
        } else if (error.request) {
          // Request made but no response received
          errorMessage = 'No response received from server';
        } else {
          // Error setting up the request
          errorMessage = error.message || 'Error setting up request';
        }
        
        // Update attempt count
        const newAttemptCount = delivery.attempt_count + 1;
        
        // Check if max retries reached
        if (newAttemptCount >= 6) {
          await db('webhook_deliveries')
            .where('id', delivery.id)
            .update({
              status: 'failed_permanently',
              error_message: errorMessage,
              attempt_count: newAttemptCount
            });
        } else {
          // Calculate next retry time
          const retryDelays = [1, 5, 15, 30, 60];
          const nextRetryMinutes = retryDelays[newAttemptCount - 1] || 60;
          const nextRetryTime = new Date();
          nextRetryTime.setMinutes(nextRetryTime.getMinutes() + nextRetryMinutes);
          
          // Update for next retry
          await db('webhook_deliveries')
            .where('id', delivery.id)
            .update({
              status: 'pending_retry',
              error_message: errorMessage,
              attempt_count: newAttemptCount,
              next_retry_at: nextRetryTime
            });
        }
        
        // Log failed retry
        await logSystemEvent({
          action: 'webhook_retry_failed',
          metadata: {
            webhook_id: delivery.webhook_id,
            delivery_id: delivery.id,
            attempt: newAttemptCount,
            error: errorMessage
          }
        });
      }
      
      processedCount++;
    }
    
    return processedCount;
  } catch (error) {
    console.error('Error processing webhook retries:', error);
    return 0;
  }
};

/**
 * Trigger webhook notifications for an event
 * @param {string} orgId - Organization ID
 * @param {string} event - Event type
 * @param {Object} payload - Event payload
 * @returns {Promise<Array>} - Delivery results
 */
const triggerWebhooks = async (orgId, event, payload) => {
  try {
    // Get active webhooks for this organization that are subscribed to this event
    const webhooks = await db('webhooks')
      .where('org_id', orgId)
      .where('active', true)
      .whereRaw(`events::jsonb @> ?::jsonb OR events::jsonb @> ?::jsonb`, [
        JSON.stringify([event]),
        JSON.stringify(['*'])
      ]);
    
    const results = [];
    
    // Send webhook notifications in parallel
    const promises = webhooks.map(webhook => 
      sendWebhookNotification(webhook.id, event, payload)
        .then(result => {
          results.push({
            webhookId: webhook.id,
            ...result
          });
          return result;
        })
    );
    
    await Promise.all(promises);
    
    return results;
  } catch (error) {
    console.error('Error triggering webhooks:', error);
    return [];
  }
};

/**
 * Get webhook delivery history for a webhook
 * @param {string} webhookId - Webhook ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Delivery history
 */
const getWebhookDeliveryHistory = async (webhookId, options = {}) => {
  try {
    const { 
      limit = 50, 
      offset = 0,
      status
    } = options;
    
    // Build query
    let query = db('webhook_deliveries')
      .where('webhook_id', webhookId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    // Filter by status if provided
    if (status) {
      query = query.where('status', status);
    }
    
    // Get deliveries
    const deliveries = await query;
    
    // Format deliveries
    return deliveries.map(delivery => ({
      id: delivery.id,
      event: JSON.parse(delivery.payload || '{}').event,
      status: delivery.status,
      attempt_count: delivery.attempt_count,
      created_at: delivery.created_at,
      delivered_at: delivery.delivered_at,
      next_retry_at: delivery.next_retry_at,
      response_code: delivery.response_code,
      error_message: delivery.error_message
    }));
  } catch (error) {
    console.error('Error getting webhook delivery history:', error);
    return [];
  }
};

/**
 * Get webhook delivery details
 * @param {string} deliveryId - Delivery ID
 * @returns {Promise<Object>} - Delivery details
 */
const getWebhookDeliveryDetails = async (deliveryId) => {
  try {
    // Get delivery
    const delivery = await db('webhook_deliveries')
      .where('id', deliveryId)
      .first();
    
    if (!delivery) {
      return null;
    }
    
    // Format delivery
    return {
      id: delivery.id,
      webhook_id: delivery.webhook_id,
      status: delivery.status,
      attempt_count: delivery.attempt_count,
      created_at: delivery.created_at,
      delivered_at: delivery.delivered_at,
      next_retry_at: delivery.next_retry_at,
      payload: JSON.parse(delivery.payload || '{}'),
      request_headers: JSON.parse(delivery.request_headers || '{}'),
      response_code: delivery.response_code,
      response_headers: JSON.parse(delivery.response_headers || '{}'),
      response_body: JSON.parse(delivery.response_body || '{}'),
      error_message: delivery.error_message
    };
  } catch (error) {
    console.error('Error getting webhook delivery details:', error);
    return null;
  }
};

/**
 * Manually retry a webhook delivery
 * @param {string} deliveryId - Delivery ID
 * @returns {Promise<Object>} - Retry result
 */
const retryWebhookDelivery = async (deliveryId) => {
  try {
    // Get delivery
    const delivery = await db('webhook_deliveries')
      .where('id', deliveryId)
      .first();
    
    if (!delivery) {
      return {
        success: false,
        message: 'Delivery not found'
      };
    }
    
    // Check if delivery can be retried
    if (!['failed', 'failed_permanently', 'pending_retry'].includes(delivery.status)) {
      return {
        success: false,
        message: `Cannot retry delivery with status: ${delivery.status}`
      };
    }
    
    // Update delivery for immediate retry
    await db('webhook_deliveries')
      .where('id', deliveryId)
      .update({
        status: 'pending_retry',
        next_retry_at: db.fn.now()
      });
    
    // Process the retry immediately
    const result = await processWebhookRetries();
    
    return {
      success: true,
      message: 'Webhook delivery queued for retry'
    };
  } catch (error) {
    console.error('Error retrying webhook delivery:', error);
    return {
      success: false,
      message: 'Error retrying webhook delivery'
    };
  }
};

module.exports = {
  sendWebhookNotification,
  triggerWebhooks,
  processWebhookRetries,
  getWebhookDeliveryHistory,
  getWebhookDeliveryDetails,
  retryWebhookDelivery
};
