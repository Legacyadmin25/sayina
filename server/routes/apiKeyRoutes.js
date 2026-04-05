const express = require('express');
const { protect, verifiedEmail, checkRole } = require('../middleware/authMiddleware');
const { apiKeyValidation } = require('../utils/validationRules');
const { validationErrorHandler } = require('../middleware/errorMiddleware');
const apiKeyController = require('../controllers/apiKeyController');

const router = express.Router();

/**
 * @route   POST /api/v1/api-keys
 * @desc    Create API key
 * @access  Private (org_admin)
 */
router.post(
  '/',
  protect,
  verifiedEmail,
  checkRole(['org_admin']),
  apiKeyValidation.createApiKey,
  validationErrorHandler,
  apiKeyController.createApiKey
);

/**
 * @route   GET /api/v1/api-keys
 * @desc    Get all API keys for organization
 * @access  Private (org_admin)
 */
router.get(
  '/',
  protect,
  verifiedEmail,
  checkRole(['org_admin']),
  apiKeyController.getApiKeys
);

/**
 * @route   GET /api/v1/api-keys/:id
 * @desc    Get API key by ID
 * @access  Private (org_admin)
 */
router.get(
  '/:id',
  protect,
  verifiedEmail,
  checkRole(['org_admin']),
  apiKeyController.getApiKeyById
);

/**
 * @route   PUT /api/v1/api-keys/:id
 * @desc    Update API key
 * @access  Private (org_admin)
 */
router.put(
  '/:id',
  protect,
  verifiedEmail,
  checkRole(['org_admin']),
  apiKeyController.updateApiKey
);

/**
 * @route   DELETE /api/v1/api-keys/:id
 * @desc    Delete API key
 * @access  Private (org_admin)
 */
router.delete(
  '/:id',
  protect,
  verifiedEmail,
  checkRole(['org_admin']),
  apiKeyValidation.deleteApiKey,
  validationErrorHandler,
  apiKeyController.deleteApiKey
);

/**
 * @route   POST /api/v1/api-keys/:id/revoke
 * @desc    Revoke API key
 * @access  Private (org_admin)
 */
router.post(
  '/:id/revoke',
  protect,
  verifiedEmail,
  checkRole(['org_admin']),
  apiKeyController.revokeApiKey
);

module.exports = router;
