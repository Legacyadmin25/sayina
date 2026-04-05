/**
 * Enterprise Integration Controller
 * 
 * This controller handles enterprise integration features for the Sayina E-Signature platform,
 * including connectors for popular enterprise systems, custom workflow triggers, and data synchronization.
 */

const { ApiError } = require('../middleware/errorMiddleware');
const {
  getAvailableConnectors,
  createIntegration,
  getIntegration,
  updateIntegration,
  deleteIntegration,
  testIntegrationConnection,
  createWorkflowTrigger,
  syncWithExternalSystem,
  getOrganizationIntegrations,
  getIntegrationWorkflowTriggers,
  getIntegrationSyncHistory
} = require('../services/enterpriseIntegrationService');
const { logSystemEvent } = require('../services/loggerService');

/**
 * @desc    Get available connectors
 * @route   GET /api/v1/integrations/connectors
 * @access  Private
 */
const getAvailableConnectorsHandler = async (req, res, next) => {
  try {
    // Get connectors
    const connectors = await getAvailableConnectors();
    
    res.status(200).json({
      success: true,
      count: connectors.length,
      data: connectors
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create integration
 * @route   POST /api/v1/integrations
 * @access  Private
 */
const createIntegrationHandler = async (req, res, next) => {
  try {
    const {
      connector_id,
      name,
      description,
      config,
      credentials
    } = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Validate required fields
    if (!connector_id || !name || !config || !credentials) {
      return next(new ApiError(400, 'Connector ID, name, config, and credentials are required'));
    }
    
    // Create integration
    const integration = await createIntegration(orgId, userId, {
      connector_id,
      name,
      description,
      config,
      credentials
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'integration_created',
      metadata: {
        integration_id: integration.id,
        connector_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'Integration created successfully',
      data: integration
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get integration
 * @route   GET /api/v1/integrations/:integrationId
 * @access  Private
 */
const getIntegrationHandler = async (req, res, next) => {
  try {
    const { integrationId } = req.params;
    const orgId = req.user.org_id;
    
    // Get integration
    const integration = await getIntegration(integrationId);
    
    // Check if integration belongs to organization
    if (integration.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to view this integration'));
    }
    
    res.status(200).json({
      success: true,
      data: integration
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update integration
 * @route   PUT /api/v1/integrations/:integrationId
 * @access  Private
 */
const updateIntegrationHandler = async (req, res, next) => {
  try {
    const { integrationId } = req.params;
    const {
      name,
      description,
      config,
      credentials,
      status
    } = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Get integration to check ownership
    const integration = await getIntegration(integrationId);
    
    // Check if integration belongs to organization
    if (integration.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to update this integration'));
    }
    
    // Update integration
    await updateIntegration(integrationId, {
      name,
      description,
      config,
      credentials,
      status
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'integration_updated',
      metadata: {
        integration_id: integrationId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Integration updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete integration
 * @route   DELETE /api/v1/integrations/:integrationId
 * @access  Private
 */
const deleteIntegrationHandler = async (req, res, next) => {
  try {
    const { integrationId } = req.params;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Get integration to check ownership
    const integration = await getIntegration(integrationId);
    
    // Check if integration belongs to organization
    if (integration.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to delete this integration'));
    }
    
    // Delete integration
    await deleteIntegration(integrationId);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'integration_deleted',
      metadata: {
        integration_id: integrationId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Integration deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Test integration connection
 * @route   POST /api/v1/integrations/:integrationId/test
 * @access  Private
 */
const testIntegrationConnectionHandler = async (req, res, next) => {
  try {
    const { integrationId } = req.params;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Get integration to check ownership
    const integration = await getIntegration(integrationId);
    
    // Check if integration belongs to organization
    if (integration.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to test this integration'));
    }
    
    // Test connection
    const testResult = await testIntegrationConnection(integrationId);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'integration_connection_tested',
      metadata: {
        integration_id: integrationId,
        success: testResult.success
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      data: testResult
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create workflow trigger
 * @route   POST /api/v1/integrations/:integrationId/triggers
 * @access  Private
 */
const createWorkflowTriggerHandler = async (req, res, next) => {
  try {
    const { integrationId } = req.params;
    const {
      name,
      description,
      event_type,
      workflow_id,
      conditions,
      mapping
    } = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Validate required fields
    if (!name || !event_type || !workflow_id) {
      return next(new ApiError(400, 'Name, event type, and workflow ID are required'));
    }
    
    // Get integration to check ownership
    const integration = await getIntegration(integrationId);
    
    // Check if integration belongs to organization
    if (integration.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to create triggers for this integration'));
    }
    
    // Create trigger
    const trigger = await createWorkflowTrigger(integrationId, {
      name,
      description,
      event_type,
      workflow_id,
      conditions,
      mapping
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'workflow_trigger_created',
      metadata: {
        integration_id: integrationId,
        trigger_id: trigger.id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'Workflow trigger created successfully',
      data: trigger
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Sync data with external system
 * @route   POST /api/v1/integrations/:integrationId/sync
 * @access  Private
 */
const syncWithExternalSystemHandler = async (req, res, next) => {
  try {
    const { integrationId } = req.params;
    const {
      sync_type,
      sync_data
    } = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Validate required fields
    if (!sync_type || !sync_data) {
      return next(new ApiError(400, 'Sync type and sync data are required'));
    }
    
    // Get integration to check ownership
    const integration = await getIntegration(integrationId);
    
    // Check if integration belongs to organization
    if (integration.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to sync with this integration'));
    }
    
    // Sync data
    const syncResult = await syncWithExternalSystem(integrationId, sync_type, sync_data);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'data_synced_with_external_system',
      metadata: {
        integration_id: integrationId,
        sync_id: syncResult.sync_id,
        sync_type
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Data synced successfully',
      data: syncResult
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get organization integrations
 * @route   GET /api/v1/integrations
 * @access  Private
 */
const getOrganizationIntegrationsHandler = async (req, res, next) => {
  try {
    const orgId = req.user.org_id;
    
    // Get integrations
    const integrations = await getOrganizationIntegrations(orgId);
    
    res.status(200).json({
      success: true,
      count: integrations.length,
      data: integrations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get integration workflow triggers
 * @route   GET /api/v1/integrations/:integrationId/triggers
 * @access  Private
 */
const getIntegrationWorkflowTriggersHandler = async (req, res, next) => {
  try {
    const { integrationId } = req.params;
    const orgId = req.user.org_id;
    
    // Get integration to check ownership
    const integration = await getIntegration(integrationId);
    
    // Check if integration belongs to organization
    if (integration.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to view triggers for this integration'));
    }
    
    // Get triggers
    const triggers = await getIntegrationWorkflowTriggers(integrationId);
    
    res.status(200).json({
      success: true,
      count: triggers.length,
      data: triggers
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get integration sync history
 * @route   GET /api/v1/integrations/:integrationId/sync-history
 * @access  Private
 */
const getIntegrationSyncHistoryHandler = async (req, res, next) => {
  try {
    const { integrationId } = req.params;
    const {
      sync_type,
      status,
      limit = 20,
      offset = 0
    } = req.query;
    
    const orgId = req.user.org_id;
    
    // Get integration to check ownership
    const integration = await getIntegration(integrationId);
    
    // Check if integration belongs to organization
    if (integration.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to view sync history for this integration'));
    }
    
    // Get sync history
    const syncHistory = await getIntegrationSyncHistory(integrationId, {
      sync_type,
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.status(200).json({
      success: true,
      count: syncHistory.length,
      data: syncHistory
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAvailableConnectorsHandler,
  createIntegrationHandler,
  getIntegrationHandler,
  updateIntegrationHandler,
  deleteIntegrationHandler,
  testIntegrationConnectionHandler,
  createWorkflowTriggerHandler,
  syncWithExternalSystemHandler,
  getOrganizationIntegrationsHandler,
  getIntegrationWorkflowTriggersHandler,
  getIntegrationSyncHistoryHandler
};
