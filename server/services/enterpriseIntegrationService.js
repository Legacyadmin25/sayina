/**
 * Enterprise Integration Service
 * 
 * This service provides enterprise integration capabilities for the Sayina E-Signature platform,
 * including connectors for popular enterprise systems, custom workflow triggers, and data synchronization.
 */

const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { logSystemEvent } = require('./loggerService');

/**
 * Get available connectors
 * @returns {Promise<Array>} - Available connectors
 */
const getAvailableConnectors = async () => {
  try {
    // In a real implementation, this would dynamically load available connectors
    // For now, we'll return a static list of supported connectors
    
    return [
      {
        id: 'sap',
        name: 'SAP',
        description: 'Connect to SAP ERP systems',
        icon: 'sap_icon.png',
        supported_versions: ['S/4HANA', 'ECC 6.0', 'Business One'],
        auth_type: 'oauth2',
        capabilities: ['document_sync', 'user_sync', 'workflow_trigger']
      },
      {
        id: 'oracle',
        name: 'Oracle',
        description: 'Connect to Oracle enterprise applications',
        icon: 'oracle_icon.png',
        supported_versions: ['Fusion', 'E-Business Suite', 'JD Edwards'],
        auth_type: 'oauth2',
        capabilities: ['document_sync', 'user_sync', 'workflow_trigger']
      },
      {
        id: 'microsoft',
        name: 'Microsoft',
        description: 'Connect to Microsoft enterprise systems',
        icon: 'microsoft_icon.png',
        supported_versions: ['Dynamics 365', 'SharePoint', 'Teams'],
        auth_type: 'oauth2',
        capabilities: ['document_sync', 'user_sync', 'workflow_trigger', 'notification']
      },
      {
        id: 'salesforce',
        name: 'Salesforce',
        description: 'Connect to Salesforce CRM',
        icon: 'salesforce_icon.png',
        supported_versions: ['Enterprise', 'Professional', 'Unlimited'],
        auth_type: 'oauth2',
        capabilities: ['document_sync', 'user_sync', 'workflow_trigger', 'notification']
      },
      {
        id: 'workday',
        name: 'Workday',
        description: 'Connect to Workday HCM',
        icon: 'workday_icon.png',
        supported_versions: ['All'],
        auth_type: 'oauth2',
        capabilities: ['user_sync', 'workflow_trigger']
      },
      {
        id: 'servicenow',
        name: 'ServiceNow',
        description: 'Connect to ServiceNow ITSM',
        icon: 'servicenow_icon.png',
        supported_versions: ['All'],
        auth_type: 'oauth2',
        capabilities: ['document_sync', 'workflow_trigger', 'notification']
      },
      {
        id: 'custom',
        name: 'Custom API',
        description: 'Connect to custom API endpoints',
        icon: 'api_icon.png',
        supported_versions: ['All'],
        auth_type: 'api_key',
        capabilities: ['document_sync', 'user_sync', 'workflow_trigger', 'notification']
      }
    ];
  } catch (error) {
    console.error('Error getting available connectors:', error);
    throw error;
  }
};

/**
 * Create integration
 * @param {string} orgId - Organization ID
 * @param {string} userId - User ID
 * @param {Object} integrationData - Integration data
 * @returns {Promise<Object>} - Integration details
 */
const createIntegration = async (orgId, userId, integrationData) => {
  try {
    const {
      connector_id,
      name,
      description,
      config,
      credentials
    } = integrationData;
    
    // Validate required fields
    if (!connector_id || !name || !config || !credentials) {
      throw new Error('Connector ID, name, config, and credentials are required');
    }
    
    // Get connector
    const connectors = await getAvailableConnectors();
    const connector = connectors.find(c => c.id === connector_id);
    
    if (!connector) {
      throw new Error(`Connector not found: ${connector_id}`);
    }
    
    // Encrypt credentials
    // In a real implementation, this would use a proper encryption method
    const encryptedCredentials = JSON.stringify(credentials);
    
    // Create integration
    const integrationId = uuidv4();
    await db('integrations').insert({
      id: integrationId,
      org_id: orgId,
      created_by: userId,
      connector_id,
      name,
      description: description || null,
      config: JSON.stringify(config),
      credentials: encryptedCredentials,
      status: 'active',
      created_at: db.fn.now()
    });
    
    // Test connection
    // In a real implementation, this would actually test the connection
    const connectionStatus = {
      success: true,
      message: 'Connection successful',
      timestamp: new Date()
    };
    
    // Store connection test result
    await db('integration_connection_tests').insert({
      id: uuidv4(),
      integration_id: integrationId,
      success: connectionStatus.success,
      message: connectionStatus.message,
      created_at: db.fn.now()
    });
    
    return {
      id: integrationId,
      connector_id,
      name,
      description: description || null,
      config,
      status: 'active',
      connection_status: connectionStatus,
      created_at: new Date()
    };
  } catch (error) {
    console.error('Error creating integration:', error);
    throw error;
  }
};

/**
 * Get integration
 * @param {string} integrationId - Integration ID
 * @returns {Promise<Object>} - Integration details
 */
const getIntegration = async (integrationId) => {
  try {
    // Get integration
    const integration = await db('integrations')
      .where('id', integrationId)
      .first();
    
    if (!integration) {
      throw new Error('Integration not found');
    }
    
    // Get latest connection test
    const connectionTest = await db('integration_connection_tests')
      .where('integration_id', integrationId)
      .orderBy('created_at', 'desc')
      .first();
    
    // Format integration
    return {
      id: integration.id,
      org_id: integration.org_id,
      connector_id: integration.connector_id,
      name: integration.name,
      description: integration.description,
      config: JSON.parse(integration.config),
      status: integration.status,
      connection_status: connectionTest ? {
        success: connectionTest.success,
        message: connectionTest.message,
        timestamp: connectionTest.created_at
      } : null,
      created_at: integration.created_at,
      updated_at: integration.updated_at
    };
  } catch (error) {
    console.error('Error getting integration:', error);
    throw error;
  }
};

/**
 * Update integration
 * @param {string} integrationId - Integration ID
 * @param {Object} integrationData - Updated integration data
 * @returns {Promise<boolean>} - Success status
 */
const updateIntegration = async (integrationId, integrationData) => {
  try {
    const {
      name,
      description,
      config,
      credentials,
      status
    } = integrationData;
    
    // Get integration
    const integration = await db('integrations')
      .where('id', integrationId)
      .first();
    
    if (!integration) {
      throw new Error('Integration not found');
    }
    
    // Build update object
    const updateObj = {};
    
    if (name !== undefined) updateObj.name = name;
    if (description !== undefined) updateObj.description = description;
    if (config !== undefined) updateObj.config = JSON.stringify(config);
    if (credentials !== undefined) {
      // Encrypt credentials
      // In a real implementation, this would use a proper encryption method
      updateObj.credentials = JSON.stringify(credentials);
    }
    if (status !== undefined) updateObj.status = status;
    
    updateObj.updated_at = db.fn.now();
    
    // Update integration
    await db('integrations')
      .where('id', integrationId)
      .update(updateObj);
    
    return true;
  } catch (error) {
    console.error('Error updating integration:', error);
    throw error;
  }
};

/**
 * Delete integration
 * @param {string} integrationId - Integration ID
 * @returns {Promise<boolean>} - Success status
 */
const deleteIntegration = async (integrationId) => {
  try {
    // Get integration
    const integration = await db('integrations')
      .where('id', integrationId)
      .first();
    
    if (!integration) {
      throw new Error('Integration not found');
    }
    
    // Delete integration
    await db('integrations')
      .where('id', integrationId)
      .delete();
    
    return true;
  } catch (error) {
    console.error('Error deleting integration:', error);
    throw error;
  }
};

/**
 * Test integration connection
 * @param {string} integrationId - Integration ID
 * @returns {Promise<Object>} - Connection test result
 */
const testIntegrationConnection = async (integrationId) => {
  try {
    // Get integration
    const integration = await db('integrations')
      .where('id', integrationId)
      .first();
    
    if (!integration) {
      throw new Error('Integration not found');
    }
    
    // In a real implementation, this would actually test the connection
    // For now, we'll simulate the test
    
    // Generate random success/failure
    const success = Math.random() > 0.2; // 80% success rate
    
    // Generate message
    const message = success ? 'Connection successful' : 'Connection failed: Authentication error';
    
    // Store connection test result
    const testId = uuidv4();
    await db('integration_connection_tests').insert({
      id: testId,
      integration_id: integrationId,
      success,
      message,
      created_at: db.fn.now()
    });
    
    return {
      test_id: testId,
      integration_id: integrationId,
      success,
      message,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error testing integration connection:', error);
    throw error;
  }
};

/**
 * Create workflow trigger
 * @param {string} integrationId - Integration ID
 * @param {Object} triggerData - Trigger data
 * @returns {Promise<Object>} - Trigger details
 */
const createWorkflowTrigger = async (integrationId, triggerData) => {
  try {
    const {
      name,
      description,
      event_type,
      workflow_id,
      conditions,
      mapping
    } = triggerData;
    
    // Validate required fields
    if (!name || !event_type || !workflow_id) {
      throw new Error('Name, event type, and workflow ID are required');
    }
    
    // Get integration
    const integration = await db('integrations')
      .where('id', integrationId)
      .first();
    
    if (!integration) {
      throw new Error('Integration not found');
    }
    
    // Create trigger
    const triggerId = uuidv4();
    await db('integration_workflow_triggers').insert({
      id: triggerId,
      integration_id: integrationId,
      name,
      description: description || null,
      event_type,
      workflow_id,
      conditions: JSON.stringify(conditions || {}),
      mapping: JSON.stringify(mapping || {}),
      status: 'active',
      created_at: db.fn.now()
    });
    
    return {
      id: triggerId,
      integration_id: integrationId,
      name,
      description: description || null,
      event_type,
      workflow_id,
      conditions: conditions || {},
      mapping: mapping || {},
      status: 'active',
      created_at: new Date()
    };
  } catch (error) {
    console.error('Error creating workflow trigger:', error);
    throw error;
  }
};

/**
 * Sync data with external system
 * @param {string} integrationId - Integration ID
 * @param {string} syncType - Sync type (document, user)
 * @param {Object} syncData - Sync data
 * @returns {Promise<Object>} - Sync result
 */
const syncWithExternalSystem = async (integrationId, syncType, syncData) => {
  try {
    // Get integration
    const integration = await db('integrations')
      .where('id', integrationId)
      .first();
    
    if (!integration) {
      throw new Error('Integration not found');
    }
    
    // Validate sync type
    const validSyncTypes = ['document', 'user', 'envelope'];
    if (!validSyncTypes.includes(syncType)) {
      throw new Error(`Invalid sync type: ${syncType}`);
    }
    
    // In a real implementation, this would actually sync data with the external system
    // For now, we'll simulate the sync
    
    // Generate sync ID
    const syncId = uuidv4();
    
    // Store sync record
    await db('integration_syncs').insert({
      id: syncId,
      integration_id: integrationId,
      sync_type: syncType,
      source_id: syncData.id,
      status: 'completed',
      details: JSON.stringify({
        sync_data: syncData,
        external_id: `ext_${crypto.randomBytes(8).toString('hex')}`,
        timestamp: new Date()
      }),
      created_at: db.fn.now(),
      completed_at: db.fn.now()
    });
    
    return {
      sync_id: syncId,
      integration_id: integrationId,
      sync_type: syncType,
      source_id: syncData.id,
      status: 'completed',
      external_id: `ext_${crypto.randomBytes(8).toString('hex')}`,
      created_at: new Date(),
      completed_at: new Date()
    };
  } catch (error) {
    console.error('Error syncing with external system:', error);
    throw error;
  }
};

/**
 * Get organization integrations
 * @param {string} orgId - Organization ID
 * @returns {Promise<Array>} - Integrations
 */
const getOrganizationIntegrations = async (orgId) => {
  try {
    // Get integrations
    const integrations = await db('integrations')
      .where('org_id', orgId)
      .orderBy('created_at', 'desc');
    
    // Format integrations
    return Promise.all(integrations.map(async (integration) => {
      // Get latest connection test
      const connectionTest = await db('integration_connection_tests')
        .where('integration_id', integration.id)
        .orderBy('created_at', 'desc')
        .first();
      
      return {
        id: integration.id,
        connector_id: integration.connector_id,
        name: integration.name,
        description: integration.description,
        status: integration.status,
        connection_status: connectionTest ? {
          success: connectionTest.success,
          message: connectionTest.message,
          timestamp: connectionTest.created_at
        } : null,
        created_at: integration.created_at,
        updated_at: integration.updated_at
      };
    }));
  } catch (error) {
    console.error('Error getting organization integrations:', error);
    throw error;
  }
};

/**
 * Get integration workflow triggers
 * @param {string} integrationId - Integration ID
 * @returns {Promise<Array>} - Workflow triggers
 */
const getIntegrationWorkflowTriggers = async (integrationId) => {
  try {
    // Get triggers
    const triggers = await db('integration_workflow_triggers')
      .where('integration_id', integrationId)
      .orderBy('created_at', 'desc');
    
    // Format triggers
    return triggers.map(trigger => ({
      id: trigger.id,
      integration_id: trigger.integration_id,
      name: trigger.name,
      description: trigger.description,
      event_type: trigger.event_type,
      workflow_id: trigger.workflow_id,
      conditions: JSON.parse(trigger.conditions),
      mapping: JSON.parse(trigger.mapping),
      status: trigger.status,
      created_at: trigger.created_at,
      updated_at: trigger.updated_at
    }));
  } catch (error) {
    console.error('Error getting integration workflow triggers:', error);
    throw error;
  }
};

/**
 * Get integration sync history
 * @param {string} integrationId - Integration ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Sync history
 */
const getIntegrationSyncHistory = async (integrationId, options = {}) => {
  try {
    const {
      sync_type,
      status,
      limit = 20,
      offset = 0
    } = options;
    
    // Build query
    let query = db('integration_syncs')
      .where('integration_id', integrationId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    // Apply filters
    if (sync_type) {
      query = query.where('sync_type', sync_type);
    }
    
    if (status) {
      query = query.where('status', status);
    }
    
    // Get syncs
    const syncs = await query;
    
    // Format syncs
    return syncs.map(sync => ({
      id: sync.id,
      integration_id: sync.integration_id,
      sync_type: sync.sync_type,
      source_id: sync.source_id,
      status: sync.status,
      details: JSON.parse(sync.details),
      created_at: sync.created_at,
      completed_at: sync.completed_at
    }));
  } catch (error) {
    console.error('Error getting integration sync history:', error);
    throw error;
  }
};

module.exports = {
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
};
