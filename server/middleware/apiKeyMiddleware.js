const { verifyApiKey } = require('../utils/jwtHelper');
const { ApiError } = require('./errorMiddleware');
const { db } = require('../config/db');
const { logApiEvent } = require('../services/loggerService');
const { validateTemporaryKey, markTemporaryKeyAsUsed } = require('../utils/tempKeyHelper');

/**
 * Middleware to authenticate API key or temporary key
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateApiKey = async (req, res, next) => {
  try {
    // Get API key from header (support multiple header formats)
    const apiKey = req.headers['x-api-key'] || req.headers['api-key'];
    const tempKey = req.headers['x-temp-key'] || req.headers['temp-key'];
    
    // If a temporary key is provided, process it
    if (tempKey) {
      return await authenticateWithTemporaryKey(tempKey, req, res, next);
    }
    
    // If no API key is provided, return error
    if (!apiKey) {
      return next(new ApiError(401, 'API key is required'));
    }
    
    // Verify API key
    const decoded = verifyApiKey(apiKey);
    
    // Check if API key exists in database
    const apiKeyRecord = await db('api_keys')
      .where('id', decoded.key_id)
      .where('active', true)
      .first();
    
    if (!apiKeyRecord) {
      return next(new ApiError(401, 'Invalid or inactive API key'));
    }
    
    // Check if organization is active
    const organization = await db('organizations')
      .where('id', decoded.org_id)
      .first();
    
    if (!organization || !organization.active) {
      return next(new ApiError(401, 'Organization is inactive or does not exist'));
    }
    
    // Check if user is active (if user ID is provided)
    if (decoded.user_id) {
      const user = await db('users')
        .where('id', decoded.user_id)
        .first();
      
      if (!user || !user.active) {
        return next(new ApiError(401, 'User is inactive or does not exist'));
      }
    }
    
    // Set API key data in request
    req.apiKey = {
      id: apiKeyRecord.id,
      name: apiKeyRecord.name,
      org_id: decoded.org_id,
      user_id: decoded.user_id,
      permissions: decoded.permissions || {},
      type: 'permanent'
    };
    
    // Set user and organization data in request
    req.user = {
      id: decoded.user_id,
      org_id: decoded.org_id,
      role: 'api_user'
    };
    
    // Log API access
    logApiEvent({
      api_key_id: apiKeyRecord.id,
      org_id: decoded.org_id,
      user_id: decoded.user_id,
      endpoint: req.originalUrl,
      method: req.method,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    }).catch(console.error);
    
    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    next(new ApiError(401, 'Invalid API key'));
  }
};

/**
 * Authenticate with a temporary key
 * @param {string} tempKey - Temporary key
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateWithTemporaryKey = async (tempKey, req, res, next) => {
  try {
    // Validate the temporary key
    const { success, tempKey: tempKeyRecord, envelope, signer } = await validateTemporaryKey(tempKey);
    
    if (!success) {
      return next(new ApiError(401, 'Invalid temporary key'));
    }
    
    // Get organization details
    const organization = await db('organizations')
      .where('id', envelope.org_id)
      .first();
    
    if (!organization || !organization.active) {
      return next(new ApiError(401, 'Organization is inactive or does not exist'));
    }
    
    // Set API key data in request using temporary key information
    req.apiKey = {
      id: tempKeyRecord.id,
      name: 'Temporary Key',
      org_id: organization.id,
      envelope_id: envelope.id,
      signer_id: signer ? signer.id : null,
      permissions: {
        // Temporary keys have limited permissions
        'read:envelope': true,
        'read:document': true,
        'sign:document': true,
        'create:field_value': true
      },
      type: 'temporary',
      expires_at: tempKeyRecord.expires_at
    };
    
    // Set user and organization data in request
    req.user = {
      id: signer ? signer.id : null,
      org_id: organization.id,
      role: 'temp_signer',
      email: signer ? signer.email : null
    };
    
    // For certain signing operations, mark the temporary key as used
    if (
      req.method === 'POST' && 
      (req.path.includes('/sign') || req.path.includes('/complete'))
    ) {
      await markTemporaryKeyAsUsed(tempKey);
    }
    
    // Log API access
    logApiEvent({
      temp_key_id: tempKeyRecord.id,
      org_id: organization.id,
      envelope_id: envelope.id,
      signer_id: signer ? signer.id : null,
      endpoint: req.originalUrl,
      method: req.method,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    }).catch(console.error);
    
    next();
  } catch (error) {
    console.error('Temporary key authentication error:', error);
    next(new ApiError(401, 'Invalid temporary key'));
  }
};

/**
 * Middleware to check API key permissions
 * @param {string|string[]} requiredPermissions - Required permissions
 * @returns {Function} - Express middleware
 */
const checkApiKeyPermissions = (requiredPermissions) => {
  return (req, res, next) => {
    try {
      // Check if authenticated with API key
      if (!req.apiKey) {
        return next(new ApiError(401, 'API key authentication required'));
      }
      
      // Convert single permission to array
      const permissions = Array.isArray(requiredPermissions) 
        ? requiredPermissions 
        : [requiredPermissions];
      
      // Check if API key has required permissions
      const hasPermission = permissions.every(permission => {
        // Check for wildcard permission
        if (req.apiKey.permissions['*'] === true) {
          return true;
        }
        
        // Check for specific permission
        return req.apiKey.permissions[permission] === true;
      });
      
      if (!hasPermission) {
        return next(new ApiError(403, 'API key does not have required permissions'));
      }
      
      next();
    } catch (error) {
      console.error('API key permission check error:', error);
      next(new ApiError(403, 'Permission check failed'));
    }
  };
};

/**
 * Middleware to check if request is using a temporary key
 * @returns {Function} - Express middleware
 */
const requireTemporaryKey = () => {
  return (req, res, next) => {
    try {
      // Check if authenticated with a temporary key
      if (!req.apiKey || req.apiKey.type !== 'temporary') {
        return next(new ApiError(401, 'Temporary key authentication required'));
      }
      
      // Check if temporary key has an associated envelope ID
      if (!req.apiKey.envelope_id) {
        return next(new ApiError(403, 'Invalid temporary key for this operation'));
      }
      
      next();
    } catch (error) {
      console.error('Temporary key check error:', error);
      next(new ApiError(401, 'Temporary key authentication failed'));
    }
  };
};

/**
 * Middleware to check if request is using a temporary key for a specific envelope
 * @param {string} envelopeIdParam - Name of the parameter containing the envelope ID
 * @returns {Function} - Express middleware
 */
const checkTemporaryKeyForEnvelope = (envelopeIdParam = 'envelopeId') => {
  return (req, res, next) => {
    try {
      // Check if authenticated with a temporary key
      if (!req.apiKey || req.apiKey.type !== 'temporary') {
        return next(new ApiError(401, 'Temporary key authentication required'));
      }
      
      // Get envelope ID from request parameters
      const envelopeId = req.params[envelopeIdParam];
      
      // Check if temporary key is for the requested envelope
      if (req.apiKey.envelope_id !== envelopeId) {
        return next(new ApiError(403, 'Temporary key not valid for this envelope'));
      }
      
      next();
    } catch (error) {
      console.error('Temporary key envelope check error:', error);
      next(new ApiError(403, 'Temporary key validation failed'));
    }
  };
};

/**
 * Middleware to check if request is using a temporary key for a specific signer
 * @param {string} signerIdParam - Name of the parameter containing the signer ID
 * @returns {Function} - Express middleware
 */
const checkTemporaryKeyForSigner = (signerIdParam = 'signerId') => {
  return (req, res, next) => {
    try {
      // Check if authenticated with a temporary key
      if (!req.apiKey || req.apiKey.type !== 'temporary') {
        return next(new ApiError(401, 'Temporary key authentication required'));
      }
      
      // Get signer ID from request parameters
      const signerId = req.params[signerIdParam];
      
      // Check if temporary key is for the requested signer
      if (!req.apiKey.signer_id || req.apiKey.signer_id !== signerId) {
        return next(new ApiError(403, 'Temporary key not valid for this signer'));
      }
      
      next();
    } catch (error) {
      console.error('Temporary key signer check error:', error);
      next(new ApiError(403, 'Temporary key validation failed'));
    }
  };
};

module.exports = {
  authenticateApiKey,
  checkApiKeyPermissions,
  requireTemporaryKey,
  checkTemporaryKeyForEnvelope,
  checkTemporaryKeyForSigner
};
