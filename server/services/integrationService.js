/**
 * Integration Service
 * 
 * This service handles integration with external systems and services
 * such as document management systems, CRMs, and other business applications.
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { logSystemEvent } = require('./loggerService');
const { triggerWebhooks } = require('./webhookService');

/**
 * Register an integration for an organization
 * @param {string} orgId - Organization ID
 * @param {Object} integrationData - Integration data
 * @returns {Promise<string>} - Integration ID
 */
const registerIntegration = async (orgId, integrationData) => {
  try {
    const {
      type,
      name,
      config,
      credentials,
      active = true
    } = integrationData;
    
    // Validate integration type
    const validTypes = [
      'google_drive',
      'dropbox',
      'onedrive',
      'sharepoint',
      'salesforce',
      'hubspot',
      'zoho',
      'microsoft_teams',
      'slack',
      'zapier',
      'custom'
    ];
    
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid integration type: ${type}`);
    }
    
    // Encrypt sensitive credentials if provided
    let encryptedCredentials = null;
    if (credentials) {
      // In a real implementation, you would encrypt these credentials
      // using a secure encryption method
      encryptedCredentials = JSON.stringify(credentials);
    }
    
    // Create integration record
    const [integrationId] = await db('integrations').insert({
      id: uuidv4(),
      org_id: orgId,
      type,
      name,
      config: JSON.stringify(config || {}),
      credentials: encryptedCredentials,
      active
    }).returning('id');
    
    // Log event
    await logSystemEvent({
      action: 'integration_registered',
      metadata: {
        integration_id: integrationId,
        type,
        name
      }
    });
    
    // Trigger webhook notification
    await triggerWebhooks(orgId, 'integration.created', {
      integration_id: integrationId,
      type,
      name,
      active
    });
    
    return integrationId;
  } catch (error) {
    console.error('Error registering integration:', error);
    throw error;
  }
};

/**
 * Update an integration
 * @param {string} integrationId - Integration ID
 * @param {Object} updateData - Update data
 * @returns {Promise<boolean>} - Success status
 */
const updateIntegration = async (integrationId, updateData) => {
  try {
    const {
      name,
      config,
      credentials,
      active
    } = updateData;
    
    // Get current integration
    const integration = await db('integrations')
      .where('id', integrationId)
      .first();
    
    if (!integration) {
      throw new Error('Integration not found');
    }
    
    // Prepare update data
    const updateObj = {};
    if (name) updateObj.name = name;
    if (config) updateObj.config = JSON.stringify(config);
    if (active !== undefined) updateObj.active = active;
    
    // Handle credentials update
    if (credentials) {
      // In a real implementation, you would encrypt these credentials
      updateObj.credentials = JSON.stringify(credentials);
    }
    
    // Update integration
    await db('integrations')
      .where('id', integrationId)
      .update(updateObj);
    
    // Log event
    await logSystemEvent({
      action: 'integration_updated',
      metadata: {
        integration_id: integrationId,
        updated_fields: Object.keys(updateObj)
      }
    });
    
    // Trigger webhook notification
    await triggerWebhooks(integration.org_id, 'integration.updated', {
      integration_id: integrationId,
      type: integration.type,
      name: name || integration.name,
      active: active !== undefined ? active : integration.active
    });
    
    return true;
  } catch (error) {
    console.error('Error updating integration:', error);
    throw error;
  }
};

/**
 * Delete an integration
 * @param {string} integrationId - Integration ID
 * @returns {Promise<boolean>} - Success status
 */
const deleteIntegration = async (integrationId) => {
  try {
    // Get integration before deletion
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
    
    // Log event
    await logSystemEvent({
      action: 'integration_deleted',
      metadata: {
        integration_id: integrationId,
        type: integration.type,
        name: integration.name
      }
    });
    
    // Trigger webhook notification
    await triggerWebhooks(integration.org_id, 'integration.deleted', {
      integration_id: integrationId,
      type: integration.type,
      name: integration.name
    });
    
    return true;
  } catch (error) {
    console.error('Error deleting integration:', error);
    throw error;
  }
};

/**
 * Test an integration connection
 * @param {string} integrationId - Integration ID
 * @returns {Promise<Object>} - Test result
 */
const testIntegration = async (integrationId) => {
  try {
    // Get integration
    const integration = await db('integrations')
      .where('id', integrationId)
      .first();
    
    if (!integration) {
      throw new Error('Integration not found');
    }
    
    // Parse config and credentials
    const config = JSON.parse(integration.config || '{}');
    const credentials = integration.credentials ? JSON.parse(integration.credentials) : null;
    
    // Test based on integration type
    let testResult = { success: false, message: 'Unsupported integration type' };
    
    switch (integration.type) {
      case 'google_drive':
        testResult = await testGoogleDriveIntegration(config, credentials);
        break;
      case 'dropbox':
        testResult = await testDropboxIntegration(config, credentials);
        break;
      case 'salesforce':
        testResult = await testSalesforceIntegration(config, credentials);
        break;
      case 'slack':
        testResult = await testSlackIntegration(config, credentials);
        break;
      case 'custom':
        testResult = await testCustomIntegration(config, credentials);
        break;
      // Add other integration types as needed
    }
    
    // Log test result
    await logSystemEvent({
      action: 'integration_tested',
      metadata: {
        integration_id: integrationId,
        type: integration.type,
        success: testResult.success
      }
    });
    
    return testResult;
  } catch (error) {
    console.error('Error testing integration:', error);
    throw error;
  }
};

/**
 * Test Google Drive integration
 * @param {Object} config - Integration config
 * @param {Object} credentials - Integration credentials
 * @returns {Promise<Object>} - Test result
 */
const testGoogleDriveIntegration = async (config, credentials) => {
  try {
    if (!credentials || !credentials.access_token) {
      return { success: false, message: 'Missing access token' };
    }
    
    // Test API connection
    const response = await axios({
      method: 'get',
      url: 'https://www.googleapis.com/drive/v3/about?fields=user',
      headers: {
        Authorization: `Bearer ${credentials.access_token}`
      }
    });
    
    return {
      success: true,
      message: 'Successfully connected to Google Drive',
      data: {
        user: response.data.user
      }
    };
  } catch (error) {
    let message = 'Failed to connect to Google Drive';
    
    if (error.response) {
      if (error.response.status === 401) {
        message = 'Authentication failed. Token may be expired';
      } else {
        message = `API error: ${error.response.status}`;
      }
    }
    
    return { success: false, message, error: error.message };
  }
};

/**
 * Test Dropbox integration
 * @param {Object} config - Integration config
 * @param {Object} credentials - Integration credentials
 * @returns {Promise<Object>} - Test result
 */
const testDropboxIntegration = async (config, credentials) => {
  try {
    if (!credentials || !credentials.access_token) {
      return { success: false, message: 'Missing access token' };
    }
    
    // Test API connection
    const response = await axios({
      method: 'post',
      url: 'https://api.dropboxapi.com/2/users/get_current_account',
      headers: {
        Authorization: `Bearer ${credentials.access_token}`
      }
    });
    
    return {
      success: true,
      message: 'Successfully connected to Dropbox',
      data: {
        account_id: response.data.account_id,
        name: response.data.name
      }
    };
  } catch (error) {
    let message = 'Failed to connect to Dropbox';
    
    if (error.response) {
      if (error.response.status === 401) {
        message = 'Authentication failed. Token may be expired';
      } else {
        message = `API error: ${error.response.status}`;
      }
    }
    
    return { success: false, message, error: error.message };
  }
};

/**
 * Test Salesforce integration
 * @param {Object} config - Integration config
 * @param {Object} credentials - Integration credentials
 * @returns {Promise<Object>} - Test result
 */
const testSalesforceIntegration = async (config, credentials) => {
  try {
    if (!credentials || !credentials.access_token || !credentials.instance_url) {
      return { success: false, message: 'Missing access token or instance URL' };
    }
    
    // Test API connection
    const response = await axios({
      method: 'get',
      url: `${credentials.instance_url}/services/data/v52.0/sobjects`,
      headers: {
        Authorization: `Bearer ${credentials.access_token}`
      }
    });
    
    return {
      success: true,
      message: 'Successfully connected to Salesforce',
      data: {
        sobjects_count: response.data.sobjects.length
      }
    };
  } catch (error) {
    let message = 'Failed to connect to Salesforce';
    
    if (error.response) {
      if (error.response.status === 401) {
        message = 'Authentication failed. Token may be expired';
      } else {
        message = `API error: ${error.response.status}`;
      }
    }
    
    return { success: false, message, error: error.message };
  }
};

/**
 * Test Slack integration
 * @param {Object} config - Integration config
 * @param {Object} credentials - Integration credentials
 * @returns {Promise<Object>} - Test result
 */
const testSlackIntegration = async (config, credentials) => {
  try {
    if (!credentials || !credentials.access_token) {
      return { success: false, message: 'Missing access token' };
    }
    
    // Test API connection
    const response = await axios({
      method: 'get',
      url: 'https://slack.com/api/auth.test',
      headers: {
        Authorization: `Bearer ${credentials.access_token}`
      }
    });
    
    if (!response.data.ok) {
      return { success: false, message: response.data.error };
    }
    
    return {
      success: true,
      message: 'Successfully connected to Slack',
      data: {
        team: response.data.team,
        user: response.data.user
      }
    };
  } catch (error) {
    let message = 'Failed to connect to Slack';
    
    if (error.response) {
      message = `API error: ${error.response.status}`;
    }
    
    return { success: false, message, error: error.message };
  }
};

/**
 * Test custom integration
 * @param {Object} config - Integration config
 * @param {Object} credentials - Integration credentials
 * @returns {Promise<Object>} - Test result
 */
const testCustomIntegration = async (config, credentials) => {
  try {
    if (!config || !config.test_endpoint) {
      return { success: false, message: 'Missing test endpoint configuration' };
    }
    
    // Prepare headers
    const headers = {};
    if (credentials && credentials.api_key) {
      headers['Authorization'] = `Bearer ${credentials.api_key}`;
    }
    
    // Test API connection
    const response = await axios({
      method: config.test_method || 'get',
      url: config.test_endpoint,
      headers,
      data: config.test_payload || {}
    });
    
    return {
      success: true,
      message: 'Successfully connected to custom integration',
      data: response.data
    };
  } catch (error) {
    let message = 'Failed to connect to custom integration';
    
    if (error.response) {
      message = `API error: ${error.response.status}`;
    }
    
    return { success: false, message, error: error.message };
  }
};

/**
 * Export document to external system
 * @param {string} integrationId - Integration ID
 * @param {string} documentId - Document ID
 * @param {Object} options - Export options
 * @returns {Promise<Object>} - Export result
 */
const exportDocument = async (integrationId, documentId, options = {}) => {
  try {
    // Get integration
    const integration = await db('integrations')
      .where('id', integrationId)
      .first();
    
    if (!integration) {
      throw new Error('Integration not found');
    }
    
    if (!integration.active) {
      throw new Error('Integration is not active');
    }
    
    // Get document
    const document = await db('documents')
      .where('id', documentId)
      .first();
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Check if document belongs to the same organization as the integration
    if (document.org_id !== integration.org_id) {
      throw new Error('Document does not belong to the organization');
    }
    
    // Parse config and credentials
    const config = JSON.parse(integration.config || '{}');
    const credentials = integration.credentials ? JSON.parse(integration.credentials) : null;
    
    // Export based on integration type
    let exportResult = { success: false, message: 'Unsupported integration type' };
    
    switch (integration.type) {
      case 'google_drive':
        exportResult = await exportToGoogleDrive(document, credentials, options);
        break;
      case 'dropbox':
        exportResult = await exportToDropbox(document, credentials, options);
        break;
      case 'salesforce':
        exportResult = await exportToSalesforce(document, credentials, options);
        break;
      case 'custom':
        exportResult = await exportToCustom(document, config, credentials, options);
        break;
      // Add other integration types as needed
    }
    
    // Log export result
    await logSystemEvent({
      action: 'document_exported',
      metadata: {
        integration_id: integrationId,
        document_id: documentId,
        success: exportResult.success,
        destination: integration.type
      }
    });
    
    // Create export record
    const [exportId] = await db('document_exports').insert({
      id: uuidv4(),
      document_id: documentId,
      integration_id: integrationId,
      status: exportResult.success ? 'completed' : 'failed',
      destination: integration.type,
      external_id: exportResult.external_id || null,
      external_url: exportResult.external_url || null,
      error_message: exportResult.success ? null : exportResult.message
    }).returning('id');
    
    // Trigger webhook notification
    await triggerWebhooks(integration.org_id, 'document.exported', {
      document_id: documentId,
      integration_id: integrationId,
      export_id: exportId,
      success: exportResult.success,
      destination: integration.type
    });
    
    return {
      ...exportResult,
      export_id: exportId
    };
  } catch (error) {
    console.error('Error exporting document:', error);
    throw error;
  }
};

/**
 * Export document to Google Drive
 * @param {Object} document - Document object
 * @param {Object} credentials - Integration credentials
 * @param {Object} options - Export options
 * @returns {Promise<Object>} - Export result
 */
const exportToGoogleDrive = async (document, credentials, options = {}) => {
  try {
    if (!credentials || !credentials.access_token) {
      return { success: false, message: 'Missing access token' };
    }
    
    // Get document file path
    const fs = require('fs');
    const path = require('path');
    const filePath = path.resolve(document.file_path);
    
    if (!fs.existsSync(filePath)) {
      return { success: false, message: 'Document file not found' };
    }
    
    // Prepare file metadata
    const metadata = {
      name: options.filename || document.file_name,
      mimeType: document.file_type
    };
    
    // Add to folder if specified
    if (options.folder_id) {
      metadata.parents = [options.folder_id];
    }
    
    // Create form data
    const FormData = require('form-data');
    const form = new FormData();
    
    // Add metadata
    form.append('metadata', JSON.stringify(metadata), {
      contentType: 'application/json'
    });
    
    // Add file content
    form.append('file', fs.createReadStream(filePath));
    
    // Upload to Google Drive
    const response = await axios.post(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${credentials.access_token}`
        }
      }
    );
    
    return {
      success: true,
      message: 'Document exported to Google Drive successfully',
      external_id: response.data.id,
      external_url: `https://drive.google.com/file/d/${response.data.id}/view`
    };
  } catch (error) {
    let message = 'Failed to export to Google Drive';
    
    if (error.response) {
      if (error.response.status === 401) {
        message = 'Authentication failed. Token may be expired';
      } else {
        message = `API error: ${error.response.status}`;
      }
    }
    
    return { success: false, message, error: error.message };
  }
};

/**
 * Export document to Dropbox
 * @param {Object} document - Document object
 * @param {Object} credentials - Integration credentials
 * @param {Object} options - Export options
 * @returns {Promise<Object>} - Export result
 */
const exportToDropbox = async (document, credentials, options = {}) => {
  try {
    if (!credentials || !credentials.access_token) {
      return { success: false, message: 'Missing access token' };
    }
    
    // Get document file path
    const fs = require('fs');
    const path = require('path');
    const filePath = path.resolve(document.file_path);
    
    if (!fs.existsSync(filePath)) {
      return { success: false, message: 'Document file not found' };
    }
    
    // Read file content
    const fileContent = fs.readFileSync(filePath);
    
    // Prepare path
    const dropboxPath = options.path 
      ? `${options.path}/${options.filename || document.file_name}`.replace(/\/+/g, '/')
      : `/${options.filename || document.file_name}`;
    
    // Upload to Dropbox
    const response = await axios({
      method: 'post',
      url: 'https://content.dropboxapi.com/2/files/upload',
      headers: {
        Authorization: `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: dropboxPath,
          mode: 'add',
          autorename: true,
          mute: false
        })
      },
      data: fileContent
    });
    
    // Get shared link
    const shareResponse = await axios({
      method: 'post',
      url: 'https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings',
      headers: {
        Authorization: `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json'
      },
      data: {
        path: response.data.path_display,
        settings: {
          requested_visibility: 'public'
        }
      }
    });
    
    return {
      success: true,
      message: 'Document exported to Dropbox successfully',
      external_id: response.data.id,
      external_url: shareResponse.data.url
    };
  } catch (error) {
    let message = 'Failed to export to Dropbox';
    
    if (error.response) {
      if (error.response.status === 401) {
        message = 'Authentication failed. Token may be expired';
      } else {
        message = `API error: ${error.response.status}`;
      }
    }
    
    return { success: false, message, error: error.message };
  }
};

/**
 * Export document to Salesforce
 * @param {Object} document - Document object
 * @param {Object} credentials - Integration credentials
 * @param {Object} options - Export options
 * @returns {Promise<Object>} - Export result
 */
const exportToSalesforce = async (document, credentials, options = {}) => {
  try {
    if (!credentials || !credentials.access_token || !credentials.instance_url) {
      return { success: false, message: 'Missing access token or instance URL' };
    }
    
    // Get document file path
    const fs = require('fs');
    const path = require('path');
    const filePath = path.resolve(document.file_path);
    
    if (!fs.existsSync(filePath)) {
      return { success: false, message: 'Document file not found' };
    }
    
    // Read file content as base64
    const fileContent = fs.readFileSync(filePath).toString('base64');
    
    // Create ContentVersion in Salesforce
    const response = await axios({
      method: 'post',
      url: `${credentials.instance_url}/services/data/v52.0/sobjects/ContentVersion`,
      headers: {
        Authorization: `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json'
      },
      data: {
        Title: options.filename || document.file_name,
        PathOnClient: options.filename || document.file_name,
        VersionData: fileContent
      }
    });
    
    if (!response.data.success) {
      return { success: false, message: 'Failed to create ContentVersion in Salesforce' };
    }
    
    // Link to record if specified
    if (options.record_id && options.record_type) {
      // Get ContentDocumentId
      const contentVersionResponse = await axios({
        method: 'get',
        url: `${credentials.instance_url}/services/data/v52.0/sobjects/ContentVersion/${response.data.id}`,
        headers: {
          Authorization: `Bearer ${credentials.access_token}`
        }
      });
      
      const contentDocumentId = contentVersionResponse.data.ContentDocumentId;
      
      // Create ContentDocumentLink
      await axios({
        method: 'post',
        url: `${credentials.instance_url}/services/data/v52.0/sobjects/ContentDocumentLink`,
        headers: {
          Authorization: `Bearer ${credentials.access_token}`,
          'Content-Type': 'application/json'
        },
        data: {
          ContentDocumentId: contentDocumentId,
          LinkedEntityId: options.record_id,
          ShareType: 'V' // V = Viewer, C = Collaborator, I = Inferred
        }
      });
    }
    
    return {
      success: true,
      message: 'Document exported to Salesforce successfully',
      external_id: response.data.id,
      external_url: `${credentials.instance_url}/${response.data.id}`
    };
  } catch (error) {
    let message = 'Failed to export to Salesforce';
    
    if (error.response) {
      if (error.response.status === 401) {
        message = 'Authentication failed. Token may be expired';
      } else {
        message = `API error: ${error.response.status}`;
      }
    }
    
    return { success: false, message, error: error.message };
  }
};

/**
 * Export document to custom integration
 * @param {Object} document - Document object
 * @param {Object} config - Integration config
 * @param {Object} credentials - Integration credentials
 * @param {Object} options - Export options
 * @returns {Promise<Object>} - Export result
 */
const exportToCustom = async (document, config, credentials, options = {}) => {
  try {
    if (!config || !config.export_endpoint) {
      return { success: false, message: 'Missing export endpoint configuration' };
    }
    
    // Get document file path
    const fs = require('fs');
    const path = require('path');
    const filePath = path.resolve(document.file_path);
    
    if (!fs.existsSync(filePath)) {
      return { success: false, message: 'Document file not found' };
    }
    
    // Prepare headers
    const headers = {};
    if (credentials && credentials.api_key) {
      headers['Authorization'] = `Bearer ${credentials.api_key}`;
    }
    
    // Create form data
    const FormData = require('form-data');
    const form = new FormData();
    
    // Add metadata
    form.append('filename', options.filename || document.file_name);
    form.append('filetype', document.file_type);
    
    // Add custom metadata if specified
    if (options.metadata) {
      Object.entries(options.metadata).forEach(([key, value]) => {
        form.append(key, value);
      });
    }
    
    // Add file content
    form.append('file', fs.createReadStream(filePath));
    
    // Upload to custom endpoint
    const response = await axios.post(
      config.export_endpoint,
      form,
      {
        headers: {
          ...form.getHeaders(),
          ...headers
        }
      }
    );
    
    return {
      success: true,
      message: 'Document exported to custom integration successfully',
      external_id: response.data.id || null,
      external_url: response.data.url || null
    };
  } catch (error) {
    let message = 'Failed to export to custom integration';
    
    if (error.response) {
      message = `API error: ${error.response.status}`;
    }
    
    return { success: false, message, error: error.message };
  }
};

module.exports = {
  registerIntegration,
  updateIntegration,
  deleteIntegration,
  testIntegration,
  exportDocument
};
