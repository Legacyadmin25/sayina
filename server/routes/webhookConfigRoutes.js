const express = require('express');
const { protect, verifiedEmail, checkRole } = require('../middleware/authMiddleware');
const webhookConfigController = require('../controllers/webhookConfigController');

const router = express.Router();

/**
 * @route   POST /api/v1/webhooks/config
 * @desc    Create webhook configuration
 * @access  Private (org_admin)
 */
router.post(
  '/',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  webhookConfigController.createWebhook
);

/**
 * @route   GET /api/v1/webhooks/config
 * @desc    Get organization webhooks
 * @access  Private (org_admin)
 */
router.get(
  '/',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  webhookConfigController.getWebhooks
);

/**
 * @route   GET /api/v1/webhooks/config/:id
 * @desc    Get webhook details
 * @access  Private (org_admin)
 */
router.get(
  '/:id',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  webhookConfigController.getWebhookDetails
);

/**
 * @route   PUT /api/v1/webhooks/config/:id
 * @desc    Update webhook
 * @access  Private (org_admin)
 */
router.put(
  '/:id',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  webhookConfigController.updateWebhook
);

/**
 * @route   DELETE /api/v1/webhooks/config/:id
 * @desc    Delete webhook
 * @access  Private (org_admin)
 */
router.delete(
  '/:id',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  webhookConfigController.deleteWebhook
);

/**
 * @route   POST /api/v1/webhooks/config/:id/rotate-secret
 * @desc    Rotate webhook secret
 * @access  Private (org_admin)
 */
router.post(
  '/:id/rotate-secret',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  webhookConfigController.rotateWebhookSecret
);

/**
 * @route   GET /api/v1/webhooks/config/:id/deliveries
 * @desc    Get webhook deliveries
 * @access  Private (org_admin)
 */
router.get(
  '/:id/deliveries',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  webhookConfigController.getWebhookDeliveries
);

/**
 * @route   GET /api/v1/webhooks/config/deliveries/:deliveryId
 * @desc    Get webhook delivery details
 * @access  Private (org_admin)
 */
router.get(
  '/deliveries/:deliveryId',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  webhookConfigController.getDeliveryDetails
);

/**
 * @route   POST /api/v1/webhooks/config/deliveries/:deliveryId/retry
 * @desc    Retry webhook delivery
 * @access  Private (org_admin)
 */
router.post(
  '/deliveries/:deliveryId/retry',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  webhookConfigController.retryDelivery
);

/**
 * @route   POST /api/v1/webhooks/config/:id/test
 * @desc    Test webhook
 * @access  Private (org_admin)
 */
router.post(
  '/:id/test',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  webhookConfigController.testWebhook
);

module.exports = router;
