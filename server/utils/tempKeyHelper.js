/**
 * Temporary API Key Helper
 * 
 * This utility provides functions to manage temporary (one-time) API keys
 * for use in signing workflows and other short-lived operations.
 */

const crypto = require('crypto');
const { ApiError } = require('../middleware/errorMiddleware');
const db = require('../config/db');
const { logSecurityEvent } = require('../services/loggerService');

/**
 * Generate a new temporary API key
 * @param {string} envelopeId - ID of the envelope
 * @param {string} signerId - Optional ID of the signer
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Temporary key details
 */
const generateTemporaryKey = async (envelopeId, signerId = null, options = {}) => {
  try {
    // Default options
    const {
      expiryHours = 1,
      keyLength = 32
    } = options;

    // Check if envelope exists
    const envelope = await db('envelopes')
      .where('id', envelopeId)
      .first();
    
    if (!envelope) {
      throw new ApiError(404, 'Envelope not found');
    }

    // If signer ID is provided, check if it belongs to the envelope
    if (signerId) {
      const signer = await db('signers')
        .where('id', signerId)
        .where('envelope_id', envelopeId)
        .first();
      
      if (!signer) {
        throw new ApiError(404, 'Signer not found for this envelope');
      }
    }

    // Generate a secure random key
    const key = crypto.randomBytes(keyLength).toString('hex');
    
    // Calculate expiry timestamp
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    // Insert temporary key into the database
    const [tempKeyId] = await db('temporary_keys').insert({
      key,
      envelope_id: envelopeId,
      signer_id: signerId,
      expires_at: expiresAt
    }).returning('id');

    // Log security event
    await logSecurityEvent({
      envelope_id: envelopeId,
      signer_id: signerId,
      event_type: 'temp_key_generated',
      metadata: {
        temp_key_id: tempKeyId,
        expires_at: expiresAt
      }
    });

    return {
      id: tempKeyId,
      key,
      envelope_id: envelopeId,
      signer_id: signerId,
      expires_at: expiresAt,
      ttl_seconds: expiryHours * 3600
    };
  } catch (error) {
    console.error('Error generating temporary key:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to generate temporary key');
  }
};

/**
 * Validate a temporary API key
 * @param {string} key - Temporary API key
 * @returns {Promise<Object>} - Validation result with key details
 */
const validateTemporaryKey = async (key) => {
  try {
    // Find the temporary key in the database
    const tempKey = await db('temporary_keys')
      .where('key', key)
      .first();
    
    // Check if key exists
    if (!tempKey) {
      throw new ApiError(401, 'Invalid temporary key');
    }
    
    // Check if key has already been used
    if (tempKey.used) {
      throw new ApiError(401, 'Temporary key has already been used');
    }
    
    // Check if key has expired
    if (new Date() > new Date(tempKey.expires_at)) {
      throw new ApiError(401, 'Temporary key has expired');
    }
    
    // Get envelope details
    const envelope = await db('envelopes')
      .where('id', tempKey.envelope_id)
      .first();
    
    if (!envelope) {
      throw new ApiError(404, 'Envelope not found');
    }
    
    // Get signer details if available
    let signer = null;
    if (tempKey.signer_id) {
      signer = await db('signers')
        .where('id', tempKey.signer_id)
        .first();
    }
    
    return {
      success: true,
      tempKey,
      envelope,
      signer
    };
  } catch (error) {
    console.error('Error validating temporary key:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(401, 'Failed to validate temporary key');
  }
};

/**
 * Mark a temporary key as used
 * @param {string} key - Temporary API key
 * @returns {Promise<boolean>} - Success indicator
 */
const markTemporaryKeyAsUsed = async (key) => {
  try {
    // Update the temporary key in the database
    const updated = await db('temporary_keys')
      .where('key', key)
      .update({
        used: true,
        updated_at: new Date()
      });
    
    return updated > 0;
  } catch (error) {
    console.error('Error marking temporary key as used:', error);
    return false;
  }
};

/**
 * Clean up expired temporary keys
 * @returns {Promise<number>} - Number of keys removed
 */
const cleanupExpiredTemporaryKeys = async () => {
  try {
    // Delete expired keys from the database
    const deleted = await db('temporary_keys')
      .where('expires_at', '<', new Date())
      .delete();
    
    return deleted;
  } catch (error) {
    console.error('Error cleaning up expired temporary keys:', error);
    return 0;
  }
};

module.exports = {
  generateTemporaryKey,
  validateTemporaryKey,
  markTemporaryKeyAsUsed,
  cleanupExpiredTemporaryKeys
};
