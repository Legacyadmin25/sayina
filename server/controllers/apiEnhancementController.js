/**
 * API Enhancement Controller
 * 
 * This controller handles API enhancement features for the Sayina E-Signature platform,
 * including API documentation, client management, and usage statistics.
 */

const { ApiError } = require('../middleware/errorMiddleware');
const {
  generateApiDocumentation,
  createApiClient,
  getApiClient,
  updateApiClient,
  regenerateClientSecret,
  deleteApiClient,
  getOrganizationApiClients,
  createSdkCodeSample,
  createApiKey,
  getApiUsageStatistics
} = require('../services/apiEnhancementService');
const { logSystemEvent } = require('../services/loggerService');

/**
 * @desc    Generate API documentation
 * @route   POST /api/v1/developer/documentation
 * @access  Private
 */
const generateApiDocumentationHandler = async (req, res, next) => {
  try {
    const {
      format = 'json',
      version = 'v1',
      include_examples = true
    } = req.body;
    
    const userId = req.user.id;
    
    // Generate documentation
    const documentation = await generateApiDocumentation({
      format,
      version,
      include_examples
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'api_documentation_generated',
      metadata: {
        format,
        version
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'API documentation generated successfully',
      data: documentation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create API client
 * @route   POST /api/v1/developer/clients
 * @access  Private
 */
const createApiClientHandler = async (req, res, next) => {
  try {
    const {
      name,
      description,
      redirect_uris,
      allowed_origins,
      scopes
    } = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Validate required fields
    if (!name) {
      return next(new ApiError(400, 'Client name is required'));
    }
    
    // Create client
    const client = await createApiClient(orgId, userId, {
      name,
      description,
      redirect_uris,
      allowed_origins,
      scopes
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'api_client_created',
      metadata: {
        client_id: client.client_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'API client created successfully',
      data: client
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get API client
 * @route   GET /api/v1/developer/clients/:clientId
 * @access  Private
 */
const getApiClientHandler = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const orgId = req.user.org_id;
    
    // Get client
    const client = await getApiClient(clientId);
    
    // Check if client belongs to organization
    if (client.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to view this client'));
    }
    
    res.status(200).json({
      success: true,
      data: client
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update API client
 * @route   PUT /api/v1/developer/clients/:clientId
 * @access  Private
 */
const updateApiClientHandler = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const {
      name,
      description,
      redirect_uris,
      allowed_origins,
      scopes,
      is_active
    } = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Get client to check ownership
    const client = await getApiClient(clientId);
    
    // Check if client belongs to organization
    if (client.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to update this client'));
    }
    
    // Update client
    await updateApiClient(clientId, {
      name,
      description,
      redirect_uris,
      allowed_origins,
      scopes,
      is_active
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'api_client_updated',
      metadata: {
        client_id: clientId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'API client updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Regenerate client secret
 * @route   POST /api/v1/developer/clients/:clientId/regenerate-secret
 * @access  Private
 */
const regenerateClientSecretHandler = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Get client to check ownership
    const client = await getApiClient(clientId);
    
    // Check if client belongs to organization
    if (client.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to regenerate this client secret'));
    }
    
    // Regenerate secret
    const clientSecret = await regenerateClientSecret(clientId);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'api_client_secret_regenerated',
      metadata: {
        client_id: clientId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Client secret regenerated successfully',
      data: {
        client_secret: clientSecret
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete API client
 * @route   DELETE /api/v1/developer/clients/:clientId
 * @access  Private
 */
const deleteApiClientHandler = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Get client to check ownership
    const client = await getApiClient(clientId);
    
    // Check if client belongs to organization
    if (client.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to delete this client'));
    }
    
    // Delete client
    await deleteApiClient(clientId);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'api_client_deleted',
      metadata: {
        client_id: clientId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'API client deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get organization API clients
 * @route   GET /api/v1/developer/clients
 * @access  Private
 */
const getOrganizationApiClientsHandler = async (req, res, next) => {
  try {
    const orgId = req.user.org_id;
    
    // Get clients
    const clients = await getOrganizationApiClients(orgId);
    
    res.status(200).json({
      success: true,
      count: clients.length,
      data: clients
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create SDK code sample
 * @route   GET /api/v1/developer/code-samples
 * @access  Private
 */
const createSdkCodeSampleHandler = async (req, res, next) => {
  try {
    const {
      language,
      operation
    } = req.query;
    
    // Validate required fields
    if (!language || !operation) {
      return next(new ApiError(400, 'Language and operation are required'));
    }
    
    // Create code sample
    const sample = await createSdkCodeSample(language, operation);
    
    res.status(200).json({
      success: true,
      data: {
        language,
        operation,
        code: sample
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create API key
 * @route   POST /api/v1/developer/api-keys
 * @access  Private
 */
const createApiKeyHandler = async (req, res, next) => {
  try {
    const {
      name,
      description,
      permissions,
      expiration_days
    } = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Validate required fields
    if (!name) {
      return next(new ApiError(400, 'API key name is required'));
    }
    
    // Create API key
    const apiKey = await createApiKey(orgId, userId, {
      name,
      description,
      permissions,
      expiration_days
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'api_key_created',
      metadata: {
        key_id: apiKey.id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'API key created successfully',
      data: apiKey
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get API usage statistics
 * @route   GET /api/v1/developer/usage-statistics
 * @access  Private
 */
const getApiUsageStatisticsHandler = async (req, res, next) => {
  try {
    const {
      start_date,
      end_date,
      client_id,
      endpoint
    } = req.query;
    
    const orgId = req.user.org_id;
    
    // Get statistics
    const statistics = await getApiUsageStatistics(orgId, {
      start_date,
      end_date,
      client_id,
      endpoint
    });
    
    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateApiDocumentationHandler,
  createApiClientHandler,
  getApiClientHandler,
  updateApiClientHandler,
  regenerateClientSecretHandler,
  deleteApiClientHandler,
  getOrganizationApiClientsHandler,
  createSdkCodeSampleHandler,
  createApiKeyHandler,
  getApiUsageStatisticsHandler
};
