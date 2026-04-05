const { v4: uuidv4 } = require('uuid');
const { ApiError } = require('../middleware/errorMiddleware');
const { generateApiKey } = require('../utils/jwtHelper');
const db = require('../config/db');
const { logSecurityEvent } = require('../services/loggerService');

/**
 * @desc    Create API key
 * @route   POST /api/v1/api-keys
 * @access  Private (org_admin)
 */
const createApiKey = async (req, res, next) => {
  try {
    const { name, permissions = {}, expires_in = '365d' } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Validate name
    if (!name || name.trim() === '') {
      return next(new ApiError(400, 'API key name is required'));
    }

    // Validate permissions
    if (typeof permissions !== 'object') {
      return next(new ApiError(400, 'Permissions must be an object'));
    }

    // Generate API key ID
    const keyId = uuidv4();

    // Generate API key
    const apiKey = generateApiKey(keyId, orgId, userId, permissions, expires_in);

    // Store API key in database
    await db('api_keys').insert({
      id: keyId,
      org_id: orgId,
      user_id: userId,
      name,
      permissions: JSON.stringify(permissions),
      active: true,
      expires_at: expires_in === 'never' ? null : db.raw(`NOW() + INTERVAL '${expires_in}'`)
    });

    // Log security event
    await logSecurityEvent({
      user_id: userId,
      event_type: 'api_key_created',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      metadata: {
        key_id: keyId,
        name
      }
    });

    res.status(201).json({
      success: true,
      message: 'API key created successfully',
      data: {
        id: keyId,
        name,
        api_key: apiKey,
        permissions,
        created_at: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all API keys for organization
 * @route   GET /api/v1/api-keys
 * @access  Private (org_admin)
 */
const getApiKeys = async (req, res, next) => {
  try {
    const orgId = req.user.org_id;

    // Get API keys
    const apiKeys = await db('api_keys')
      .where('org_id', orgId)
      .select('id', 'name', 'permissions', 'active', 'created_at', 'expires_at', 'last_used_at')
      .orderBy('created_at', 'desc');

    // Format permissions
    const formattedApiKeys = apiKeys.map(key => ({
      ...key,
      permissions: JSON.parse(key.permissions || '{}')
    }));

    res.status(200).json({
      success: true,
      count: formattedApiKeys.length,
      data: formattedApiKeys
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get API key by ID
 * @route   GET /api/v1/api-keys/:id
 * @access  Private (org_admin)
 */
const getApiKeyById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;

    // Get API key
    const apiKey = await db('api_keys')
      .where('id', id)
      .where('org_id', orgId)
      .select('id', 'name', 'permissions', 'active', 'created_at', 'expires_at', 'last_used_at')
      .first();

    if (!apiKey) {
      return next(new ApiError(404, 'API key not found'));
    }

    // Format permissions
    apiKey.permissions = JSON.parse(apiKey.permissions || '{}');

    // Get usage statistics
    const usageStats = await db('api_logs')
      .where('api_key_id', id)
      .count('id as total_requests')
      .first();

    const recentUsage = await db('api_logs')
      .where('api_key_id', id)
      .select('endpoint', 'method', 'created_at')
      .orderBy('created_at', 'desc')
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        ...apiKey,
        usage: {
          total_requests: parseInt(usageStats.total_requests) || 0,
          recent_requests: recentUsage
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update API key
 * @route   PUT /api/v1/api-keys/:id
 * @access  Private (org_admin)
 */
const updateApiKey = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, permissions, active } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if API key exists
    const apiKey = await db('api_keys')
      .where('id', id)
      .where('org_id', orgId)
      .first();

    if (!apiKey) {
      return next(new ApiError(404, 'API key not found'));
    }

    // Prepare update data
    const updateData = {};

    if (name !== undefined) {
      if (!name || name.trim() === '') {
        return next(new ApiError(400, 'API key name cannot be empty'));
      }
      updateData.name = name;
    }

    if (permissions !== undefined) {
      if (typeof permissions !== 'object') {
        return next(new ApiError(400, 'Permissions must be an object'));
      }
      updateData.permissions = JSON.stringify(permissions);
    }

    if (active !== undefined) {
      updateData.active = active;
    }

    // Update API key
    await db('api_keys')
      .where('id', id)
      .update({
        ...updateData,
        updated_at: db.fn.now()
      });

    // Log security event
    await logSecurityEvent({
      user_id: userId,
      event_type: 'api_key_updated',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      metadata: {
        key_id: id,
        changes: Object.keys(updateData)
      }
    });

    // Get updated API key
    const updatedApiKey = await db('api_keys')
      .where('id', id)
      .select('id', 'name', 'permissions', 'active', 'created_at', 'updated_at', 'expires_at')
      .first();

    // Format permissions
    updatedApiKey.permissions = JSON.parse(updatedApiKey.permissions || '{}');

    res.status(200).json({
      success: true,
      message: 'API key updated successfully',
      data: updatedApiKey
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete API key
 * @route   DELETE /api/v1/api-keys/:id
 * @access  Private (org_admin)
 */
const deleteApiKey = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if API key exists
    const apiKey = await db('api_keys')
      .where('id', id)
      .where('org_id', orgId)
      .first();

    if (!apiKey) {
      return next(new ApiError(404, 'API key not found'));
    }

    // Delete API key
    await db('api_keys')
      .where('id', id)
      .delete();

    // Log security event
    await logSecurityEvent({
      user_id: userId,
      event_type: 'api_key_deleted',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      metadata: {
        key_id: id,
        key_name: apiKey.name
      }
    });

    res.status(200).json({
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Revoke API key
 * @route   POST /api/v1/api-keys/:id/revoke
 * @access  Private (org_admin)
 */
const revokeApiKey = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if API key exists
    const apiKey = await db('api_keys')
      .where('id', id)
      .where('org_id', orgId)
      .first();

    if (!apiKey) {
      return next(new ApiError(404, 'API key not found'));
    }

    // Revoke API key
    await db('api_keys')
      .where('id', id)
      .update({
        active: false,
        revoked_at: db.fn.now(),
        revoked_by: userId
      });

    // Log security event
    await logSecurityEvent({
      user_id: userId,
      event_type: 'api_key_revoked',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      metadata: {
        key_id: id,
        key_name: apiKey.name
      }
    });

    res.status(200).json({
      success: true,
      message: 'API key revoked successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createApiKey,
  getApiKeys,
  getApiKeyById,
  updateApiKey,
  deleteApiKey,
  revokeApiKey
};
