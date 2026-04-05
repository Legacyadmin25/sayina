/**
 * Biometric Authentication Controller
 * 
 * This controller handles biometric authentication features for the Sayina E-Signature platform,
 * including fingerprint, facial recognition, and voice authentication.
 */

const { ApiError } = require('../middleware/errorMiddleware');
const {
  registerBiometricData,
  verifyBiometricData,
  deleteBiometricData,
  getUserBiometricData,
  getBiometricVerificationHistory,
  authenticateForSigning,
  verifySigningToken,
  processSignatureImage,
  getBiometricAuthMethods
} = require('../services/biometricAuthService');
const { logSystemEvent } = require('../services/loggerService');

/**
 * @desc    Register biometric data
 * @route   POST /api/v1/biometric/register
 * @access  Private
 */
const registerBiometricDataHandler = async (req, res, next) => {
  try {
    const {
      type,
      data,
      device_info
    } = req.body;
    
    const userId = req.user.id;
    
    // Validate required fields
    if (!type || !data) {
      return next(new ApiError(400, 'Type and data are required'));
    }
    
    // Register biometric data
    const result = await registerBiometricData(userId, {
      type,
      data,
      device_info
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'biometric_data_registered',
      metadata: {
        type,
        status: result.status
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: `Biometric data ${result.status} successfully`,
      data: {
        id: result.id,
        type,
        created_at: result.created_at
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify biometric data
 * @route   POST /api/v1/biometric/verify
 * @access  Private
 */
const verifyBiometricDataHandler = async (req, res, next) => {
  try {
    const {
      type,
      data,
      device_info
    } = req.body;
    
    const userId = req.user.id;
    
    // Validate required fields
    if (!type || !data) {
      return next(new ApiError(400, 'Type and data are required'));
    }
    
    // Verify biometric data
    const result = await verifyBiometricData(userId, {
      type,
      data,
      device_info
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'biometric_data_verified',
      metadata: {
        type,
        success: result.verified
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete biometric data
 * @route   DELETE /api/v1/biometric/:type
 * @access  Private
 */
const deleteBiometricDataHandler = async (req, res, next) => {
  try {
    const { type } = req.params;
    const userId = req.user.id;
    
    // Delete biometric data
    const success = await deleteBiometricData(userId, type);
    
    if (!success) {
      return next(new ApiError(404, `No ${type} biometric data found for this user`));
    }
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'biometric_data_deleted',
      metadata: {
        type
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: `${type} biometric data deleted successfully`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user biometric data
 * @route   GET /api/v1/biometric
 * @access  Private
 */
const getUserBiometricDataHandler = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get biometric data
    const biometrics = await getUserBiometricData(userId);
    
    res.status(200).json({
      success: true,
      count: biometrics.length,
      data: biometrics
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get biometric verification history
 * @route   GET /api/v1/biometric/history
 * @access  Private
 */
const getBiometricVerificationHistoryHandler = async (req, res, next) => {
  try {
    const {
      type,
      success,
      limit = 20,
      offset = 0
    } = req.query;
    
    const userId = req.user.id;
    
    // Get history
    const history = await getBiometricVerificationHistory(userId, {
      type,
      success: success === 'true',
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate with biometrics for signing
 * @route   POST /api/v1/biometric/authenticate-for-signing
 * @access  Private
 */
const authenticateForSigningHandler = async (req, res, next) => {
  try {
    const {
      document_id,
      type,
      data,
      device_info
    } = req.body;
    
    const userId = req.user.id;
    
    // Validate required fields
    if (!document_id || !type || !data) {
      return next(new ApiError(400, 'Document ID, type, and data are required'));
    }
    
    // Authenticate for signing
    const result = await authenticateForSigning(userId, document_id, {
      type,
      data,
      device_info
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'biometric_authentication_for_signing',
      metadata: {
        document_id,
        type,
        success: result.authenticated
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify signing token
 * @route   POST /api/v1/biometric/verify-signing-token
 * @access  Private
 */
const verifySigningTokenHandler = async (req, res, next) => {
  try {
    const {
      document_id,
      signing_token
    } = req.body;
    
    const userId = req.user.id;
    
    // Validate required fields
    if (!document_id || !signing_token) {
      return next(new ApiError(400, 'Document ID and signing token are required'));
    }
    
    // Verify token
    const isValid = await verifySigningToken(userId, document_id, signing_token);
    
    if (!isValid) {
      return next(new ApiError(401, 'Invalid or expired signing token'));
    }
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'signing_token_verified',
      metadata: {
        document_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Signing token verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Process signature image
 * @route   POST /api/v1/biometric/process-signature
 * @access  Private
 */
const processSignatureImageHandler = async (req, res, next) => {
  try {
    const { signature_data } = req.body;
    
    const userId = req.user.id;
    
    // Validate required fields
    if (!signature_data) {
      return next(new ApiError(400, 'Signature data is required'));
    }
    
    // Process signature
    const signaturePath = await processSignatureImage(signature_data);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'signature_processed',
      metadata: {
        signature_path: signaturePath
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Signature processed successfully',
      data: {
        signature_path: signaturePath
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get biometric authentication methods
 * @route   GET /api/v1/biometric/methods
 * @access  Private
 */
const getBiometricAuthMethodsHandler = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get methods
    const methods = await getBiometricAuthMethods(userId);
    
    res.status(200).json({
      success: true,
      data: methods
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerBiometricDataHandler,
  verifyBiometricDataHandler,
  deleteBiometricDataHandler,
  getUserBiometricDataHandler,
  getBiometricVerificationHistoryHandler,
  authenticateForSigningHandler,
  verifySigningTokenHandler,
  processSignatureImageHandler,
  getBiometricAuthMethodsHandler
};
