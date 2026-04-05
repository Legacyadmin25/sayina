const express = require('express');
const webhookController = require('../controllers/webhookController');

const router = express.Router();

/**
 * @route   POST /api/v1/webhooks/payfast
 * @desc    Handle PayFast payment notifications (ITN)
 * @access  Public
 */
router.post('/payfast', webhookController.handlePayfastWebhook);

/**
 * @route   POST /api/v1/webhooks/bulksms
 * @desc    Handle BulkSMS delivery status updates
 * @access  Public
 */
router.post('/bulksms', webhookController.handleBulkSmsWebhook);

module.exports = router;
