/**
 * Biometric Authentication Service
 * 
 * This service provides biometric authentication capabilities for the Sayina E-Signature platform,
 * including fingerprint, facial recognition, and voice authentication.
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { db } = require('../config/db');
const { logSystemEvent } = require('./loggerService');

/**
 * Register biometric data
 * @param {string} userId - User ID
 * @param {Object} biometricData - Biometric data
 * @returns {Promise<Object>} - Registration result
 */
const registerBiometricData = async (userId, biometricData) => {
  try {
    const {
      type,
      data,
      device_info
    } = biometricData;
    
    // Validate biometric type
    const validTypes = ['fingerprint', 'facial', 'voice', 'signature'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid biometric type: ${type}`);
    }
    
    // Check if user already has this biometric type registered
    const existingBiometric = await db('biometric_data')
      .where('user_id', userId)
      .where('type', type)
      .first();
    
    // Generate biometric ID
    const biometricId = uuidv4();
    
    // Hash the biometric data
    // In a real implementation, this would use a more sophisticated
    // biometric template protection scheme
    const hashedData = crypto.createHash('sha256').update(data).digest('hex');
    
    if (existingBiometric) {
      // Update existing biometric
      await db('biometric_data')
        .where('id', existingBiometric.id)
        .update({
          data: hashedData,
          device_info: JSON.stringify(device_info || {}),
          updated_at: db.fn.now()
        });
      
      return {
        id: existingBiometric.id,
        type,
        status: 'updated',
        created_at: existingBiometric.created_at,
        updated_at: new Date()
      };
    } else {
      // Create new biometric
      await db('biometric_data').insert({
        id: biometricId,
        user_id: userId,
        type,
        data: hashedData,
        device_info: JSON.stringify(device_info || {}),
        created_at: db.fn.now()
      });
      
      return {
        id: biometricId,
        type,
        status: 'created',
        created_at: new Date()
      };
    }
  } catch (error) {
    console.error('Error registering biometric data:', error);
    throw error;
  }
};

/**
 * Verify biometric data
 * @param {string} userId - User ID
 * @param {Object} biometricData - Biometric data to verify
 * @returns {Promise<Object>} - Verification result
 */
const verifyBiometricData = async (userId, biometricData) => {
  try {
    const {
      type,
      data,
      device_info
    } = biometricData;
    
    // Validate biometric type
    const validTypes = ['fingerprint', 'facial', 'voice', 'signature'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid biometric type: ${type}`);
    }
    
    // Get stored biometric data
    const storedBiometric = await db('biometric_data')
      .where('user_id', userId)
      .where('type', type)
      .first();
    
    if (!storedBiometric) {
      return {
        verified: false,
        message: `No ${type} biometric data registered for this user`
      };
    }
    
    // Hash the provided biometric data
    const hashedData = crypto.createHash('sha256').update(data).digest('hex');
    
    // In a real implementation, this would use a more sophisticated
    // biometric comparison algorithm with appropriate thresholds
    const isMatch = storedBiometric.data === hashedData;
    
    // Log verification attempt
    await db('biometric_verifications').insert({
      id: uuidv4(),
      user_id: userId,
      biometric_id: storedBiometric.id,
      type,
      success: isMatch,
      device_info: JSON.stringify(device_info || {}),
      created_at: db.fn.now()
    });
    
    return {
      verified: isMatch,
      message: isMatch ? 'Biometric verification successful' : 'Biometric verification failed',
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error verifying biometric data:', error);
    throw error;
  }
};

/**
 * Delete biometric data
 * @param {string} userId - User ID
 * @param {string} type - Biometric type
 * @returns {Promise<boolean>} - Success status
 */
const deleteBiometricData = async (userId, type) => {
  try {
    // Validate biometric type
    const validTypes = ['fingerprint', 'facial', 'voice', 'signature'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid biometric type: ${type}`);
    }
    
    // Get stored biometric data
    const storedBiometric = await db('biometric_data')
      .where('user_id', userId)
      .where('type', type)
      .first();
    
    if (!storedBiometric) {
      return false;
    }
    
    // Delete biometric data
    await db('biometric_data')
      .where('id', storedBiometric.id)
      .delete();
    
    return true;
  } catch (error) {
    console.error('Error deleting biometric data:', error);
    throw error;
  }
};

/**
 * Get user biometric data
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - User biometric data
 */
const getUserBiometricData = async (userId) => {
  try {
    // Get all biometric data for user
    const biometrics = await db('biometric_data')
      .where('user_id', userId)
      .select('id', 'type', 'created_at', 'updated_at');
    
    return biometrics.map(biometric => ({
      id: biometric.id,
      type: biometric.type,
      created_at: biometric.created_at,
      updated_at: biometric.updated_at
    }));
  } catch (error) {
    console.error('Error getting user biometric data:', error);
    throw error;
  }
};

/**
 * Get biometric verification history
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Verification history
 */
const getBiometricVerificationHistory = async (userId, options = {}) => {
  try {
    const {
      type,
      success,
      limit = 20,
      offset = 0
    } = options;
    
    // Build query
    let query = db('biometric_verifications')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    // Apply filters
    if (type) {
      query = query.where('type', type);
    }
    
    if (success !== undefined) {
      query = query.where('success', success);
    }
    
    // Get history
    const history = await query;
    
    return history.map(item => ({
      id: item.id,
      type: item.type,
      success: item.success,
      device_info: JSON.parse(item.device_info),
      created_at: item.created_at
    }));
  } catch (error) {
    console.error('Error getting biometric verification history:', error);
    throw error;
  }
};

/**
 * Authenticate with biometrics for signing
 * @param {string} userId - User ID
 * @param {string} documentId - Document ID
 * @param {Object} biometricData - Biometric data
 * @returns {Promise<Object>} - Authentication result
 */
const authenticateForSigning = async (userId, documentId, biometricData) => {
  try {
    // Verify biometric data
    const verificationResult = await verifyBiometricData(userId, biometricData);
    
    if (!verificationResult.verified) {
      return {
        authenticated: false,
        message: verificationResult.message
      };
    }
    
    // Generate signing token
    const signingToken = crypto.randomBytes(32).toString('hex');
    
    // Store signing token
    await db('biometric_signing_tokens').insert({
      id: uuidv4(),
      user_id: userId,
      document_id: documentId,
      token: signingToken,
      biometric_type: biometricData.type,
      expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      created_at: db.fn.now()
    });
    
    return {
      authenticated: true,
      message: 'Biometric authentication successful',
      signing_token: signingToken,
      expires_in: 300 // 5 minutes in seconds
    };
  } catch (error) {
    console.error('Error authenticating for signing:', error);
    throw error;
  }
};

/**
 * Verify signing token
 * @param {string} userId - User ID
 * @param {string} documentId - Document ID
 * @param {string} signingToken - Signing token
 * @returns {Promise<boolean>} - Verification result
 */
const verifySigningToken = async (userId, documentId, signingToken) => {
  try {
    // Get token
    const token = await db('biometric_signing_tokens')
      .where('user_id', userId)
      .where('document_id', documentId)
      .where('token', signingToken)
      .where('expires_at', '>', db.fn.now())
      .first();
    
    if (!token) {
      return false;
    }
    
    // Delete token after use
    await db('biometric_signing_tokens')
      .where('id', token.id)
      .delete();
    
    return true;
  } catch (error) {
    console.error('Error verifying signing token:', error);
    throw error;
  }
};

/**
 * Process signature image
 * @param {string} signatureData - Base64 encoded signature image
 * @returns {Promise<string>} - Processed signature path
 */
const processSignatureImage = async (signatureData) => {
  try {
    // Remove data URL prefix if present
    const base64Data = signatureData.replace(/^data:image\/\w+;base64,/, '');
    
    // Generate signature ID
    const signatureId = uuidv4();
    
    // Create signatures directory if it doesn't exist
    const signaturesDir = path.join(__dirname, '..', 'uploads', 'signatures');
    if (!fs.existsSync(signaturesDir)) {
      fs.mkdirSync(signaturesDir, { recursive: true });
    }
    
    // Save signature image
    const signaturePath = path.join(signaturesDir, `${signatureId}.png`);
    fs.writeFileSync(signaturePath, Buffer.from(base64Data, 'base64'));
    
    return signaturePath;
  } catch (error) {
    console.error('Error processing signature image:', error);
    throw error;
  }
};

/**
 * Get biometric authentication methods
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Available authentication methods
 */
const getBiometricAuthMethods = async (userId) => {
  try {
    // Get all biometric data for user
    const biometrics = await db('biometric_data')
      .where('user_id', userId)
      .select('type');
    
    // Format response
    const methods = {
      fingerprint: false,
      facial: false,
      voice: false,
      signature: false
    };
    
    biometrics.forEach(biometric => {
      methods[biometric.type] = true;
    });
    
    return methods;
  } catch (error) {
    console.error('Error getting biometric authentication methods:', error);
    throw error;
  }
};

module.exports = {
  registerBiometricData,
  verifyBiometricData,
  deleteBiometricData,
  getUserBiometricData,
  getBiometricVerificationHistory,
  authenticateForSigning,
  verifySigningToken,
  processSignatureImage,
  getBiometricAuthMethods
};
