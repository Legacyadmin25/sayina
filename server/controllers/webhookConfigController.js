/**
 * Webhook Configuration Controller
 * 
 * This controller handles the management of webhook configurations for organizations,
 * allowing them to receive notifications about events in the Sayina E-Signature platform.
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { ApiError } = require('../middleware/errorMiddleware');
const db = require('../config/db');
const { logSystemEvent } = require('../services/loggerService');
const { getWebhookDeliveryHistory, getWebhookDeliveryDetails, retryWebhookDelivery } = require('../services/webhookService');

/**
 * @desc    Create webhook configuration
 * @route   POST /api/v1/webhooks/config
 * @access  Private (org_admin)
 */
const createWebhook = async (req, res, next) => {
  try {
    const {
      name,
      url,
      events,
      description,
      active = true
    } = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Validate required fields
    if (!name || !url || !events || !Array.isArray(events)) {
      return next(new ApiError(400, 'Name, URL, and events array are required'));
    }
    
    // Validate URL
    try {
      new URL(url);
    } catch (error) {
      return next(new ApiError(400, 'Invalid URL format'));
    }
    
    // Validate events
    const validEvents = [
      '*',
      'envelope.created',
      'envelope.updated',
      'envelope.completed',
      'envelope.voided',
      'envelope.deleted',
      'signer.created',
      'signer.updated',
      'signer.completed',
      'signer.declined',
      'document.viewed',
      'document.signed',
      'document.completed',
      'payment.succeeded',
      'payment.failed',
      'user.created',
      'user.updated'
    ];
    
    const invalidEvents = events.filter(event => !validEvents.includes(event));
    if (invalidEvents.length > 0) {
      return next(new ApiError(400, `Invalid events: ${invalidEvents.join(', ')}`));
    }
    
    // Generate webhook secret
    const secret = crypto.randomBytes(32).toString('hex');
    
    // Create webhook
    const [webhookId] = await db('webhooks').insert({
      id: uuidv4(),
      org_id: orgId,
      name,
      url,
      events: JSON.stringify(events),
      description: description || null,
      secret,
      active,
      created_by: userId
    }).returning('id');
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'webhook_created',
      metadata: {
        webhook_id: webhookId,
        name,
        url,
        events
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    // Get created webhook
    const webhook = await db('webhooks')
      .where('id', webhookId)
      .first();
    
    // Format response
    const formattedWebhook = {
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      events: JSON.parse(webhook.events),
      description: webhook.description,
      active: webhook.active,
      created_at: webhook.created_at,
      secret: webhook.secret // Only return secret on creation
    };
    
    res.status(201).json({
      success: true,
      message: 'Webhook created successfully',
      data: formattedWebhook
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get organization webhooks
 * @route   GET /api/v1/webhooks/config
 * @access  Private (org_admin)
 */
const getWebhooks = async (req, res, next) => {
  try {
    const orgId = req.user.org_id;
    
    // Get webhooks
    const webhooks = await db('webhooks')
      .where('org_id', orgId)
      .orderBy('created_at', 'desc');
    
    // Format webhooks
    const formattedWebhooks = webhooks.map(webhook => ({
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      events: JSON.parse(webhook.events),
      description: webhook.description,
      active: webhook.active,
      created_at: webhook.created_at
    }));
    
    res.status(200).json({
      success: true,
      count: formattedWebhooks.length,
      data: formattedWebhooks
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get webhook details
 * @route   GET /api/v1/webhooks/config/:id
 * @access  Private (org_admin)
 */
const getWebhookDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;
    
    // Get webhook
    const webhook = await db('webhooks')
      .where('id', id)
      .where('org_id', orgId)
      .first();
    
    if (!webhook) {
      return next(new ApiError(404, 'Webhook not found'));
    }
    
    // Format webhook
    const formattedWebhook = {
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      events: JSON.parse(webhook.events),
      description: webhook.description,
      active: webhook.active,
      created_at: webhook.created_at,
      last_updated: webhook.updated_at
    };
    
    res.status(200).json({
      success: true,
      data: formattedWebhook
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update webhook
 * @route   PUT /api/v1/webhooks/config/:id
 * @access  Private (org_admin)
 */
const updateWebhook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      url,
      events,
      description,
      active
    } = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Get webhook
    const webhook = await db('webhooks')
      .where('id', id)
      .where('org_id', orgId)
      .first();
    
    if (!webhook) {
      return next(new ApiError(404, 'Webhook not found'));
    }
    
    // Validate URL if provided
    if (url) {
      try {
        new URL(url);
      } catch (error) {
        return next(new ApiError(400, 'Invalid URL format'));
      }
    }
    
    // Validate events if provided
    if (events) {
      if (!Array.isArray(events)) {
        return next(new ApiError(400, 'Events must be an array'));
      }
      
      const validEvents = [
        '*',
        'envelope.created',
        'envelope.updated',
        'envelope.completed',
        'envelope.voided',
        'envelope.deleted',
        'signer.created',
        'signer.updated',
        'signer.completed',
        'signer.declined',
        'document.viewed',
        'document.signed',
        'document.completed',
        'payment.succeeded',
        'payment.failed',
        'user.created',
        'user.updated'
      ];
      
      const invalidEvents = events.filter(event => !validEvents.includes(event));
      if (invalidEvents.length > 0) {
        return next(new ApiError(400, `Invalid events: ${invalidEvents.join(', ')}`));
      }
    }
    
    // Prepare update data
    const updateData = {};
    if (name) updateData.name = name;
    if (url) updateData.url = url;
    if (events) updateData.events = JSON.stringify(events);
    if (description !== undefined) updateData.description = description;
    if (active !== undefined) updateData.active = active;
    updateData.updated_at = db.fn.now();
    
    // Update webhook
    await db('webhooks')
      .where('id', id)
      .update(updateData);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'webhook_updated',
      metadata: {
        webhook_id: id,
        updates: Object.keys(updateData)
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    // Get updated webhook
    const updatedWebhook = await db('webhooks')
      .where('id', id)
      .first();
    
    // Format response
    const formattedWebhook = {
      id: updatedWebhook.id,
      name: updatedWebhook.name,
      url: updatedWebhook.url,
      events: JSON.parse(updatedWebhook.events),
      description: updatedWebhook.description,
      active: updatedWebhook.active,
      created_at: updatedWebhook.created_at,
      updated_at: updatedWebhook.updated_at
    };
    
    res.status(200).json({
      success: true,
      message: 'Webhook updated successfully',
      data: formattedWebhook
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete webhook
 * @route   DELETE /api/v1/webhooks/config/:id
 * @access  Private (org_admin)
 */
const deleteWebhook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Get webhook
    const webhook = await db('webhooks')
      .where('id', id)
      .where('org_id', orgId)
      .first();
    
    if (!webhook) {
      return next(new ApiError(404, 'Webhook not found'));
    }
    
    // Delete webhook
    await db('webhooks')
      .where('id', id)
      .delete();
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'webhook_deleted',
      metadata: {
        webhook_id: id,
        name: webhook.name,
        url: webhook.url
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Webhook deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Rotate webhook secret
 * @route   POST /api/v1/webhooks/config/:id/rotate-secret
 * @access  Private (org_admin)
 */
const rotateWebhookSecret = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Get webhook
    const webhook = await db('webhooks')
      .where('id', id)
      .where('org_id', orgId)
      .first();
    
    if (!webhook) {
      return next(new ApiError(404, 'Webhook not found'));
    }
    
    // Generate new secret
    const newSecret = crypto.randomBytes(32).toString('hex');
    
    // Update webhook
    await db('webhooks')
      .where('id', id)
      .update({
        secret: newSecret,
        updated_at: db.fn.now()
      });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'webhook_secret_rotated',
      metadata: {
        webhook_id: id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Webhook secret rotated successfully',
      data: {
        id,
        secret: newSecret
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get webhook deliveries
 * @route   GET /api/v1/webhooks/config/:id/deliveries
 * @access  Private (org_admin)
 */
const getWebhookDeliveries = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0, status } = req.query;
    const orgId = req.user.org_id;
    
    // Get webhook
    const webhook = await db('webhooks')
      .where('id', id)
      .where('org_id', orgId)
      .first();
    
    if (!webhook) {
      return next(new ApiError(404, 'Webhook not found'));
    }
    
    // Get deliveries
    const deliveries = await getWebhookDeliveryHistory(id, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      status
    });
    
    res.status(200).json({
      success: true,
      count: deliveries.length,
      data: deliveries
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get webhook delivery details
 * @route   GET /api/v1/webhooks/config/deliveries/:deliveryId
 * @access  Private (org_admin)
 */
const getDeliveryDetails = async (req, res, next) => {
  try {
    const { deliveryId } = req.params;
    const orgId = req.user.org_id;
    
    // Get delivery details
    const delivery = await getWebhookDeliveryDetails(deliveryId);
    
    if (!delivery) {
      return next(new ApiError(404, 'Delivery not found'));
    }
    
    // Check if webhook belongs to organization
    const webhook = await db('webhooks')
      .where('id', delivery.webhook_id)
      .where('org_id', orgId)
      .first();
    
    if (!webhook) {
      return next(new ApiError(403, 'You do not have permission to view this delivery'));
    }
    
    res.status(200).json({
      success: true,
      data: delivery
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Retry webhook delivery
 * @route   POST /api/v1/webhooks/config/deliveries/:deliveryId/retry
 * @access  Private (org_admin)
 */
const retryDelivery = async (req, res, next) => {
  try {
    const { deliveryId } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Get delivery details
    const delivery = await getWebhookDeliveryDetails(deliveryId);
    
    if (!delivery) {
      return next(new ApiError(404, 'Delivery not found'));
    }
    
    // Check if webhook belongs to organization
    const webhook = await db('webhooks')
      .where('id', delivery.webhook_id)
      .where('org_id', orgId)
      .first();
    
    if (!webhook) {
      return next(new ApiError(403, 'You do not have permission to retry this delivery'));
    }
    
    // Retry delivery
    const result = await retryWebhookDelivery(deliveryId);
    
    if (!result.success) {
      return next(new ApiError(400, result.message));
    }
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'webhook_delivery_retried',
      metadata: {
        webhook_id: webhook.id,
        delivery_id: deliveryId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Webhook delivery queued for retry'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Test webhook
 * @route   POST /api/v1/webhooks/config/:id/test
 * @access  Private (org_admin)
 */
const testWebhook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Get webhook
    const webhook = await db('webhooks')
      .where('id', id)
      .where('org_id', orgId)
      .first();
    
    if (!webhook) {
      return next(new ApiError(404, 'Webhook not found'));
    }
    
    // Send test event
    const { sendWebhookNotification } = require('../services/webhookService');
    const result = await sendWebhookNotification(id, 'test.ping', {
      message: 'This is a test webhook from Sayina E-Signature Service',
      timestamp: new Date().toISOString(),
      org_id: orgId
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'webhook_tested',
      metadata: {
        webhook_id: id,
        success: result.success,
        delivery_id: result.deliveryId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Test webhook sent successfully',
        data: {
          delivery_id: result.deliveryId
        }
      });
    } else {
      res.status(200).json({
        success: false,
        message: 'Test webhook failed',
        error: result.error,
        data: {
          delivery_id: result.deliveryId
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createWebhook,
  getWebhooks,
  getWebhookDetails,
  updateWebhook,
  deleteWebhook,
  rotateWebhookSecret,
  getWebhookDeliveries,
  getDeliveryDetails,
  retryDelivery,
  testWebhook
};
