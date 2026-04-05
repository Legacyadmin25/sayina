/**
 * Mobile Optimization Controller
 * 
 * This controller handles mobile optimization features for the Sayina E-Signature platform,
 * including responsive signing experiences, touch-friendly interfaces, and mobile notifications.
 */

const { ApiError } = require('../middleware/errorMiddleware');
const {
  generateMobileSigningUrl,
  validateMobileSigningToken,
  optimizeDocumentForMobile,
  sendMobileSigningNotification,
  processTouchSignature,
  trackMobileDeviceInfo,
  getMobileSigningStatistics
} = require('../services/mobileOptimizationService');
const { logSystemEvent } = require('../services/loggerService');

/**
 * @desc    Generate mobile signing URL
 * @route   POST /api/v1/mobile/envelopes/:envelopeId/signers/:signerId/url
 * @access  Private
 */
const generateMobileSigningUrlHandler = async (req, res, next) => {
  try {
    const { envelopeId, signerId } = req.params;
    const { options } = req.body;
    const userId = req.user.id;
    
    // Generate mobile signing URL
    const mobileSigningDetails = await generateMobileSigningUrl(envelopeId, signerId, options);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'mobile_signing_url_generated',
      metadata: {
        envelope_id: envelopeId,
        signer_id: signerId,
        session_id: mobileSigningDetails.session_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'Mobile signing URL generated successfully',
      data: mobileSigningDetails
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Validate mobile signing token
 * @route   GET /api/v1/mobile/sign/:token
 * @access  Public
 */
const validateMobileSigningTokenHandler = async (req, res, next) => {
  try {
    const { token } = req.params;
    
    // Validate token
    const sessionDetails = await validateMobileSigningToken(token);
    
    res.status(200).json({
      success: true,
      data: sessionDetails
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Optimize document for mobile viewing
 * @route   POST /api/v1/mobile/documents/:documentId/optimize
 * @access  Private
 */
const optimizeDocumentForMobileHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;
    
    // Optimize document
    const optimizedFilePath = await optimizeDocumentForMobile(documentId);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'document_optimized_for_mobile',
      metadata: {
        document_id: documentId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Document optimized for mobile successfully',
      data: {
        optimized_file_path: optimizedFilePath
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send mobile signing notification
 * @route   POST /api/v1/mobile/signers/:signerId/notify
 * @access  Private
 */
const sendMobileSigningNotificationHandler = async (req, res, next) => {
  try {
    const { signerId } = req.params;
    const { mobile_url } = req.body;
    const userId = req.user.id;
    
    if (!mobile_url) {
      return next(new ApiError(400, 'Mobile signing URL is required'));
    }
    
    // Send notification
    const success = await sendMobileSigningNotification(signerId, mobile_url);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'mobile_signing_notification_sent',
      metadata: {
        signer_id: signerId,
        success
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: success ? 'Mobile signing notification sent successfully' : 'Failed to send notification',
      data: {
        delivered: success
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Process touch signature
 * @route   POST /api/v1/mobile/signers/:signerId/signature
 * @access  Public
 */
const processTouchSignatureHandler = async (req, res, next) => {
  try {
    const { signerId } = req.params;
    const { image, type } = req.body;
    
    if (!image) {
      return next(new ApiError(400, 'Signature image data is required'));
    }
    
    // Process signature
    const signatureFilePath = await processTouchSignature(signerId, {
      image,
      type
    });
    
    res.status(201).json({
      success: true,
      message: 'Touch signature processed successfully',
      data: {
        signature_path: signatureFilePath
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Track mobile device info
 * @route   POST /api/v1/mobile/sessions/:sessionId/device-info
 * @access  Public
 */
const trackMobileDeviceInfoHandler = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const deviceInfo = req.body;
    
    if (!deviceInfo || typeof deviceInfo !== 'object') {
      return next(new ApiError(400, 'Device information is required'));
    }
    
    // Track device info
    await trackMobileDeviceInfo(sessionId, deviceInfo);
    
    res.status(200).json({
      success: true,
      message: 'Mobile device information tracked successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get mobile signing statistics
 * @route   GET /api/v1/mobile/statistics
 * @access  Private
 */
const getMobileSigningStatisticsHandler = async (req, res, next) => {
  try {
    const orgId = req.user.org_id;
    
    // Get statistics
    const statistics = await getMobileSigningStatistics(orgId);
    
    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download mobile-optimized document
 * @route   GET /api/v1/mobile/documents/:documentId/download
 * @access  Public (with token)
 */
const downloadMobileOptimizedDocumentHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { token } = req.query;
    
    if (!token) {
      return next(new ApiError(401, 'Authentication token is required'));
    }
    
    // Validate token
    const sessionDetails = await validateMobileSigningToken(token);
    
    // Check if document belongs to envelope
    const documentBelongsToEnvelope = sessionDetails.documents.some(doc => doc.id === documentId);
    
    if (!documentBelongsToEnvelope) {
      return next(new ApiError(403, 'Document does not belong to the signing session'));
    }
    
    // Optimize document if not already optimized
    const optimizedFilePath = await optimizeDocumentForMobile(documentId);
    
    // Get document details
    const document = sessionDetails.documents.find(doc => doc.id === documentId);
    
    // Send file
    res.download(optimizedFilePath, document.name);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateMobileSigningUrlHandler,
  validateMobileSigningTokenHandler,
  optimizeDocumentForMobileHandler,
  sendMobileSigningNotificationHandler,
  processTouchSignatureHandler,
  trackMobileDeviceInfoHandler,
  getMobileSigningStatisticsHandler,
  downloadMobileOptimizedDocumentHandler
};
