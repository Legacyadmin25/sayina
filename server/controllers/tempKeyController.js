/**
 * Temporary Key Controller
 * 
 * Handles API endpoints for creating and managing temporary API keys
 * for envelope signing and other short-lived operations.
 */

const { generateTemporaryKey, cleanupExpiredTemporaryKeys } = require('../utils/tempKeyHelper');
const { ApiError } = require('../middleware/errorMiddleware');
const db = require('../config/db');

/**
 * Create a temporary API key for an envelope
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const createTemporaryKey = async (req, res, next) => {
  try {
    const { envelopeId } = req.params;
    const { signer_id, expiry_hours = 1 } = req.body;

    // Check if user has permission to create keys for this envelope
    const envelope = await db('envelopes')
      .where('id', envelopeId)
      .where('org_id', req.user.org_id)
      .first();

    if (!envelope) {
      throw new ApiError(404, 'Envelope not found or you don\'t have access');
    }

    // If signer ID is provided, check if it belongs to the envelope
    if (signer_id) {
      const signer = await db('signers')
        .where('id', signer_id)
        .where('envelope_id', envelopeId)
        .first();
      
      if (!signer) {
        throw new ApiError(404, 'Signer not found for this envelope');
      }
    }

    // Generate temporary key
    const tempKey = await generateTemporaryKey(envelopeId, signer_id, {
      expiryHours: Math.min(Math.max(1, expiry_hours), 48) // Limit between 1 and 48 hours
    });

    // Return temporary key details
    res.status(201).json({
      status: 'success',
      data: {
        key: tempKey.key,
        envelope_id: envelopeId,
        signer_id: signer_id || null,
        expires_at: tempKey.expires_at,
        ttl_seconds: tempKey.ttl_seconds
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get temporary keys for an envelope
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getEnvelopeTemporaryKeys = async (req, res, next) => {
  try {
    const { envelopeId } = req.params;

    // Check if user has permission to view keys for this envelope
    const envelope = await db('envelopes')
      .where('id', envelopeId)
      .where('org_id', req.user.org_id)
      .first();

    if (!envelope) {
      throw new ApiError(404, 'Envelope not found or you don\'t have access');
    }

    // Get all temporary keys for the envelope
    const tempKeys = await db('temporary_keys')
      .where('envelope_id', envelopeId)
      .leftJoin('signers', 'temporary_keys.signer_id', 'signers.id')
      .select(
        'temporary_keys.id',
        'temporary_keys.envelope_id',
        'temporary_keys.signer_id',
        'temporary_keys.used',
        'temporary_keys.expires_at',
        'temporary_keys.created_at',
        'signers.name as signer_name',
        'signers.email as signer_email'
      )
      .orderBy('temporary_keys.created_at', 'desc');

    // Return temporary keys (without actual key values for security)
    res.status(200).json({
      status: 'success',
      count: tempKeys.length,
      data: tempKeys
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Invalidate a temporary key
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const invalidateTemporaryKey = async (req, res, next) => {
  try {
    const { keyId } = req.params;

    // Get the temporary key
    const tempKey = await db('temporary_keys')
      .where('id', keyId)
      .first();

    if (!tempKey) {
      throw new ApiError(404, 'Temporary key not found');
    }

    // Check if user has permission to manage this envelope's keys
    const envelope = await db('envelopes')
      .where('id', tempKey.envelope_id)
      .where('org_id', req.user.org_id)
      .first();

    if (!envelope) {
      throw new ApiError(403, 'You don\'t have permission to manage this key');
    }

    // Mark the key as used
    await db('temporary_keys')
      .where('id', keyId)
      .update({
        used: true,
        updated_at: new Date()
      });

    res.status(200).json({
      status: 'success',
      message: 'Temporary key invalidated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clean up all expired temporary keys
 * Only accessible to administrators
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const cleanupAllExpiredKeys = async (req, res, next) => {
  try {
    // Check if user is an administrator
    if (req.user.role !== 'admin') {
      throw new ApiError(403, 'Only administrators can perform this action');
    }

    // Clean up expired keys
    const deletedCount = await cleanupExpiredTemporaryKeys();

    res.status(200).json({
      status: 'success',
      message: `${deletedCount} expired temporary keys have been cleaned up`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTemporaryKey,
  getEnvelopeTemporaryKeys,
  invalidateTemporaryKey,
  cleanupAllExpiredKeys
};
