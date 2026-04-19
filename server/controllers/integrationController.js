/**
 * Integration Controller
 * 
 * This controller handles the management of external integrations for the
 * Sayina E-Signature Service, allowing connection to various third-party services.
 */

const { ApiError } = require('../middleware/errorMiddleware');
const { db } = require('../config/db');
const { logSystemEvent } = require('../services/loggerService');
const { 
  registerIntegration, 
  updateIntegration, 
  deleteIntegration, 
  testIntegration,
  exportDocument
} = require('../services/integrationService');

/**
 * @desc    Create integration
 * @route   POST /api/v1/integrations
 * @access  Private (org_admin)
 */
const createIntegration = async (req, res, next) => {
  try {
    const {
      type,
      name,
      config,
      credentials,
      active = true
    } = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Validate required fields
    if (!type || !name) {
      return next(new ApiError(400, 'Type and name are required'));
    }
    
    // Register integration
    const integrationId = await registerIntegration(orgId, {
      type,
      name,
      config,
      credentials,
      active
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'integration_created',
      metadata: {
        integration_id: integrationId,
        type,
        name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    // Get created integration (without credentials)
    const integration = await db('integrations')
      .where('id', integrationId)
      .select('id', 'org_id', 'type', 'name', 'config', 'active', 'created_at')
      .first();
    
    // Format response
    const formattedIntegration = {
      ...integration,
      config: JSON.parse(integration.config || '{}')
    };
    
    res.status(201).json({
      success: true,
      message: 'Integration created successfully',
      data: formattedIntegration
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get organization integrations
 * @route   GET /api/v1/integrations
 * @access  Private (org_admin)
 */
const getIntegrations = async (req, res, next) => {
  try {
    const orgId = req.user.org_id;
    
    // Get integrations
    const integrations = await db('integrations')
      .where('org_id', orgId)
      .select('id', 'type', 'name', 'config', 'active', 'created_at', 'updated_at')
      .orderBy('created_at', 'desc');
    
    // Format integrations
    const formattedIntegrations = integrations.map(integration => ({
      ...integration,
      config: JSON.parse(integration.config || '{}')
    }));
    
    res.status(200).json({
      success: true,
      count: formattedIntegrations.length,
      data: formattedIntegrations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get integration details
 * @route   GET /api/v1/integrations/:id
 * @access  Private (org_admin)
 */
const getIntegrationDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;
    
    // Get integration
    const integration = await db('integrations')
      .where('id', id)
      .where('org_id', orgId)
      .select('id', 'type', 'name', 'config', 'active', 'created_at', 'updated_at')
      .first();
    
    if (!integration) {
      return next(new ApiError(404, 'Integration not found'));
    }
    
    // Format integration
    const formattedIntegration = {
      ...integration,
      config: JSON.parse(integration.config || '{}')
    };
    
    res.status(200).json({
      success: true,
      data: formattedIntegration
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update integration
 * @route   PUT /api/v1/integrations/:id
 * @access  Private (org_admin)
 */
const updateIntegrationDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      config,
      credentials,
      active
    } = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Check if integration exists and belongs to organization
    const integration = await db('integrations')
      .where('id', id)
      .where('org_id', orgId)
      .first();
    
    if (!integration) {
      return next(new ApiError(404, 'Integration not found'));
    }
    
    // Update integration
    const success = await updateIntegration(id, {
      name,
      config,
      credentials,
      active
    });
    
    if (!success) {
      return next(new ApiError(500, 'Failed to update integration'));
    }
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'integration_updated',
      metadata: {
        integration_id: id,
        type: integration.type,
        name: name || integration.name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    // Get updated integration
    const updatedIntegration = await db('integrations')
      .where('id', id)
      .select('id', 'type', 'name', 'config', 'active', 'created_at', 'updated_at')
      .first();
    
    // Format response
    const formattedIntegration = {
      ...updatedIntegration,
      config: JSON.parse(updatedIntegration.config || '{}')
    };
    
    res.status(200).json({
      success: true,
      message: 'Integration updated successfully',
      data: formattedIntegration
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete integration
 * @route   DELETE /api/v1/integrations/:id
 * @access  Private (org_admin)
 */
const deleteIntegrationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Check if integration exists and belongs to organization
    const integration = await db('integrations')
      .where('id', id)
      .where('org_id', orgId)
      .first();
    
    if (!integration) {
      return next(new ApiError(404, 'Integration not found'));
    }
    
    // Delete integration
    const success = await deleteIntegration(id);
    
    if (!success) {
      return next(new ApiError(500, 'Failed to delete integration'));
    }
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'integration_deleted',
      metadata: {
        integration_id: id,
        type: integration.type,
        name: integration.name
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
 * @route   POST /api/v1/integrations/:id/test
 * @access  Private (org_admin)
 */
const testIntegrationConnection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Check if integration exists and belongs to organization
    const integration = await db('integrations')
      .where('id', id)
      .where('org_id', orgId)
      .first();
    
    if (!integration) {
      return next(new ApiError(404, 'Integration not found'));
    }
    
    // Test integration
    const testResult = await testIntegration(id);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'integration_tested',
      metadata: {
        integration_id: id,
        type: integration.type,
        success: testResult.success
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: testResult.success,
      message: testResult.message,
      data: testResult.data || {}
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export document to integration
 * @route   POST /api/v1/integrations/:id/export/:documentId
 * @access  Private (org_admin)
 */
const exportDocumentToIntegration = async (req, res, next) => {
  try {
    const { id, documentId } = req.params;
    const options = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Check if integration exists and belongs to organization
    const integration = await db('integrations')
      .where('id', id)
      .where('org_id', orgId)
      .first();
    
    if (!integration) {
      return next(new ApiError(404, 'Integration not found'));
    }
    
    // Check if document exists and belongs to organization
    const document = await db('documents')
      .where('id', documentId)
      .where('org_id', orgId)
      .first();
    
    if (!document) {
      return next(new ApiError(404, 'Document not found'));
    }
    
    // Export document
    const exportResult = await exportDocument(id, documentId, options);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'document_exported',
      metadata: {
        integration_id: id,
        document_id: documentId,
        success: exportResult.success,
        export_id: exportResult.export_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    if (exportResult.success) {
      res.status(200).json({
        success: true,
        message: exportResult.message,
        data: {
          export_id: exportResult.export_id,
          external_id: exportResult.external_id,
          external_url: exportResult.external_url
        }
      });
    } else {
      res.status(200).json({
        success: false,
        message: exportResult.message,
        error: exportResult.error
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get document exports
 * @route   GET /api/v1/integrations/exports/:documentId
 * @access  Private
 */
const getDocumentExports = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Check if document exists and belongs to organization
    const document = await db('documents')
      .where('id', documentId)
      .where('org_id', orgId)
      .first();
    
    if (!document) {
      return next(new ApiError(404, 'Document not found'));
    }
    
    // Get exports
    const exports = await db('document_exports')
      .join('integrations', 'document_exports.integration_id', 'integrations.id')
      .where('document_exports.document_id', documentId)
      .select(
        'document_exports.id',
        'document_exports.status',
        'document_exports.destination',
        'document_exports.external_id',
        'document_exports.external_url',
        'document_exports.error_message',
        'document_exports.created_at',
        'integrations.id as integration_id',
        'integrations.name as integration_name',
        'integrations.type as integration_type'
      )
      .orderBy('document_exports.created_at', 'desc');
    
    res.status(200).json({
      success: true,
      count: exports.length,
      data: exports
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get available integration types
 * @route   GET /api/v1/integrations/types
 * @access  Private
 */
const getIntegrationTypes = async (req, res, next) => {
  try {
    // Define available integration types
    const integrationTypes = [
      {
        id: 'google_drive',
        name: 'Google Drive',
        description: 'Store and access documents in Google Drive',
        icon: 'google-drive',
        capabilities: ['export', 'import']
      },
      {
        id: 'dropbox',
        name: 'Dropbox',
        description: 'Store and access documents in Dropbox',
        icon: 'dropbox',
        capabilities: ['export', 'import']
      },
      {
        id: 'onedrive',
        name: 'Microsoft OneDrive',
        description: 'Store and access documents in OneDrive',
        icon: 'onedrive',
        capabilities: ['export', 'import']
      },
      {
        id: 'sharepoint',
        name: 'Microsoft SharePoint',
        description: 'Store and access documents in SharePoint',
        icon: 'sharepoint',
        capabilities: ['export', 'import']
      },
      {
        id: 'salesforce',
        name: 'Salesforce',
        description: 'Connect with Salesforce CRM',
        icon: 'salesforce',
        capabilities: ['export', 'contact_sync']
      },
      {
        id: 'hubspot',
        name: 'HubSpot',
        description: 'Connect with HubSpot CRM',
        icon: 'hubspot',
        capabilities: ['export', 'contact_sync']
      },
      {
        id: 'zoho',
        name: 'Zoho',
        description: 'Connect with Zoho CRM',
        icon: 'zoho',
        capabilities: ['export', 'contact_sync']
      },
      {
        id: 'microsoft_teams',
        name: 'Microsoft Teams',
        description: 'Send notifications to Microsoft Teams',
        icon: 'microsoft-teams',
        capabilities: ['notifications']
      },
      {
        id: 'slack',
        name: 'Slack',
        description: 'Send notifications to Slack',
        icon: 'slack',
        capabilities: ['notifications']
      },
      {
        id: 'zapier',
        name: 'Zapier',
        description: 'Connect with thousands of apps via Zapier',
        icon: 'zapier',
        capabilities: ['export', 'import', 'notifications', 'automation']
      },
      {
        id: 'custom',
        name: 'Custom Integration',
        description: 'Connect with any system using custom API endpoints',
        icon: 'code',
        capabilities: ['export', 'import', 'notifications', 'automation']
      }
    ];
    
    res.status(200).json({
      success: true,
      count: integrationTypes.length,
      data: integrationTypes
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createIntegration,
  getIntegrations,
  getIntegrationDetails,
  updateIntegrationDetails,
  deleteIntegrationById,
  testIntegrationConnection,
  exportDocumentToIntegration,
  getDocumentExports,
  getIntegrationTypes
};
