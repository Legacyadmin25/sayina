const express = require('express');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const apiEnhancementController = require('../controllers/apiEnhancementController');

const router = express.Router();

/**
 * API Documentation Routes
 */

/**
 * @route   POST /api/v1/developer/documentation
 * @desc    Generate API documentation
 * @access  Private
 */
router.post(
  '/documentation',
  protect,
  verifiedEmail,
  apiEnhancementController.generateApiDocumentationHandler
);

/**
 * API Client Routes
 */

/**
 * @route   POST /api/v1/developer/clients
 * @desc    Create API client
 * @access  Private
 */
router.post(
  '/clients',
  protect,
  verifiedEmail,
  apiEnhancementController.createApiClientHandler
);

/**
 * @route   GET /api/v1/developer/clients
 * @desc    Get organization API clients
 * @access  Private
 */
router.get(
  '/clients',
  protect,
  apiEnhancementController.getOrganizationApiClientsHandler
);

/**
 * @route   GET /api/v1/developer/clients/:clientId
 * @desc    Get API client
 * @access  Private
 */
router.get(
  '/clients/:clientId',
  protect,
  apiEnhancementController.getApiClientHandler
);

/**
 * @route   PUT /api/v1/developer/clients/:clientId
 * @desc    Update API client
 * @access  Private
 */
router.put(
  '/clients/:clientId',
  protect,
  verifiedEmail,
  apiEnhancementController.updateApiClientHandler
);

/**
 * @route   POST /api/v1/developer/clients/:clientId/regenerate-secret
 * @desc    Regenerate client secret
 * @access  Private
 */
router.post(
  '/clients/:clientId/regenerate-secret',
  protect,
  verifiedEmail,
  apiEnhancementController.regenerateClientSecretHandler
);

/**
 * @route   DELETE /api/v1/developer/clients/:clientId
 * @desc    Delete API client
 * @access  Private
 */
router.delete(
  '/clients/:clientId',
  protect,
  verifiedEmail,
  apiEnhancementController.deleteApiClientHandler
);

/**
 * SDK Code Samples Routes
 */

/**
 * @route   GET /api/v1/developer/code-samples
 * @desc    Create SDK code sample
 * @access  Private
 */
router.get(
  '/code-samples',
  protect,
  apiEnhancementController.createSdkCodeSampleHandler
);

/**
 * API Key Routes
 */

/**
 * @route   POST /api/v1/developer/api-keys
 * @desc    Create API key
 * @access  Private
 */
router.post(
  '/api-keys',
  protect,
  verifiedEmail,
  apiEnhancementController.createApiKeyHandler
);

/**
 * API Usage Statistics Routes
 */

/**
 * @route   GET /api/v1/developer/usage-statistics
 * @desc    Get API usage statistics
 * @access  Private
 */
router.get(
  '/usage-statistics',
  protect,
  apiEnhancementController.getApiUsageStatisticsHandler
);

module.exports = router;
