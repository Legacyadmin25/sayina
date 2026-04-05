const express = require('express');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const enterpriseIntegrationController = require('../controllers/enterpriseIntegrationController');

const router = express.Router();

/**
 * Connector Routes
 */

/**
 * @route   GET /api/v1/integrations/connectors
 * @desc    Get available connectors
 * @access  Private
 */
router.get(
  '/connectors',
  protect,
  enterpriseIntegrationController.getAvailableConnectorsHandler
);

/**
 * Integration Management Routes
 */

/**
 * @route   POST /api/v1/integrations
 * @desc    Create integration
 * @access  Private
 */
router.post(
  '/',
  protect,
  verifiedEmail,
  enterpriseIntegrationController.createIntegrationHandler
);

/**
 * @route   GET /api/v1/integrations
 * @desc    Get organization integrations
 * @access  Private
 */
router.get(
  '/',
  protect,
  enterpriseIntegrationController.getOrganizationIntegrationsHandler
);

/**
 * @route   GET /api/v1/integrations/:integrationId
 * @desc    Get integration
 * @access  Private
 */
router.get(
  '/:integrationId',
  protect,
  enterpriseIntegrationController.getIntegrationHandler
);

/**
 * @route   PUT /api/v1/integrations/:integrationId
 * @desc    Update integration
 * @access  Private
 */
router.put(
  '/:integrationId',
  protect,
  verifiedEmail,
  enterpriseIntegrationController.updateIntegrationHandler
);

/**
 * @route   DELETE /api/v1/integrations/:integrationId
 * @desc    Delete integration
 * @access  Private
 */
router.delete(
  '/:integrationId',
  protect,
  verifiedEmail,
  enterpriseIntegrationController.deleteIntegrationHandler
);

/**
 * @route   POST /api/v1/integrations/:integrationId/test
 * @desc    Test integration connection
 * @access  Private
 */
router.post(
  '/:integrationId/test',
  protect,
  enterpriseIntegrationController.testIntegrationConnectionHandler
);

/**
 * Workflow Trigger Routes
 */

/**
 * @route   POST /api/v1/integrations/:integrationId/triggers
 * @desc    Create workflow trigger
 * @access  Private
 */
router.post(
  '/:integrationId/triggers',
  protect,
  verifiedEmail,
  enterpriseIntegrationController.createWorkflowTriggerHandler
);

/**
 * @route   GET /api/v1/integrations/:integrationId/triggers
 * @desc    Get integration workflow triggers
 * @access  Private
 */
router.get(
  '/:integrationId/triggers',
  protect,
  enterpriseIntegrationController.getIntegrationWorkflowTriggersHandler
);

/**
 * Data Synchronization Routes
 */

/**
 * @route   POST /api/v1/integrations/:integrationId/sync
 * @desc    Sync data with external system
 * @access  Private
 */
router.post(
  '/:integrationId/sync',
  protect,
  verifiedEmail,
  enterpriseIntegrationController.syncWithExternalSystemHandler
);

/**
 * @route   GET /api/v1/integrations/:integrationId/sync-history
 * @desc    Get integration sync history
 * @access  Private
 */
router.get(
  '/:integrationId/sync-history',
  protect,
  enterpriseIntegrationController.getIntegrationSyncHistoryHandler
);

module.exports = router;
