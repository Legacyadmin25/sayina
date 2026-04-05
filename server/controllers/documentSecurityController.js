/**
 * Document Security Controller
 * 
 * This controller handles document security features for the Sayina E-Signature platform,
 * including password protection, watermarking, and secure viewing options.
 */

const { ApiError } = require('../middleware/errorMiddleware');
const {
  applyPasswordProtection,
  applyWatermark,
  generateSecureViewingLink,
  validateSecureViewingToken,
  getDocumentSecuritySettings,
  getSecureViewingLinks,
  revokeSecureViewingLink,
  getSecureViewingAccessLogs
} = require('../services/documentSecurityService');
const { logSystemEvent } = require('../services/loggerService');

/**
 * @desc    Apply password protection to a document
 * @route   POST /api/v1/documents/:documentId/security/password-protection
 * @access  Private
 */
const applyPasswordProtectionHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { ownerPassword, userPassword, permissions } = req.body;
    const userId = req.user.id;
    
    // Validate passwords
    if (!ownerPassword && !userPassword) {
      return next(new ApiError(400, 'At least one password (owner or user) is required'));
    }
    
    // Apply password protection
    const securedFilePath = await applyPasswordProtection(documentId, {
      ownerPassword,
      userPassword,
      permissions
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'document_password_protection_applied',
      metadata: {
        document_id: documentId,
        has_owner_password: !!ownerPassword,
        has_user_password: !!userPassword
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Password protection applied successfully',
      data: {
        secured_file_path: securedFilePath
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Apply watermark to a document
 * @route   POST /api/v1/documents/:documentId/security/watermark
 * @access  Private
 */
const applyWatermarkHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const {
      text,
      opacity,
      color,
      fontSize,
      rotation,
      position
    } = req.body;
    const userId = req.user.id;
    
    // Validate watermark text
    if (!text) {
      return next(new ApiError(400, 'Watermark text is required'));
    }
    
    // Apply watermark
    const watermarkedFilePath = await applyWatermark(documentId, {
      text,
      opacity,
      color,
      fontSize,
      rotation,
      position
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'document_watermark_applied',
      metadata: {
        document_id: documentId,
        watermark_text: text
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Watermark applied successfully',
      data: {
        watermarked_file_path: watermarkedFilePath
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate secure viewing link
 * @route   POST /api/v1/documents/:documentId/security/secure-link
 * @access  Private
 */
const generateSecureViewingLinkHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const {
      expiresIn,
      allowDownload,
      allowPrint,
      requireAuthentication,
      watermarkText
    } = req.body;
    const userId = req.user.id;
    
    // Generate secure viewing link
    const linkDetails = await generateSecureViewingLink(documentId, {
      expiresIn,
      allowDownload,
      allowPrint,
      requireAuthentication,
      watermarkText
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'secure_viewing_link_generated',
      metadata: {
        document_id: documentId,
        link_id: linkDetails.id,
        expires_at: linkDetails.expires_at
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'Secure viewing link generated successfully',
      data: linkDetails
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Validate secure viewing token
 * @route   GET /api/v1/security/secure-view/:token
 * @access  Public
 */
const validateSecureViewingTokenHandler = async (req, res, next) => {
  try {
    const { token } = req.params;
    
    // Validate token
    const viewingDetails = await validateSecureViewingToken(token);
    
    res.status(200).json({
      success: true,
      data: viewingDetails
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get document security settings
 * @route   GET /api/v1/documents/:documentId/security
 * @access  Private
 */
const getDocumentSecuritySettingsHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    
    // Get security settings
    const securitySettings = await getDocumentSecuritySettings(documentId);
    
    res.status(200).json({
      success: true,
      count: securitySettings.length,
      data: securitySettings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get secure viewing links
 * @route   GET /api/v1/documents/:documentId/security/secure-links
 * @access  Private
 */
const getSecureViewingLinksHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    
    // Get secure viewing links
    const links = await getSecureViewingLinks(documentId);
    
    res.status(200).json({
      success: true,
      count: links.length,
      data: links
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Revoke secure viewing link
 * @route   DELETE /api/v1/security/secure-links/:linkId
 * @access  Private
 */
const revokeSecureViewingLinkHandler = async (req, res, next) => {
  try {
    const { linkId } = req.params;
    const userId = req.user.id;
    
    // Revoke link
    await revokeSecureViewingLink(linkId);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'secure_viewing_link_revoked',
      metadata: {
        link_id: linkId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Secure viewing link revoked successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get secure viewing access logs
 * @route   GET /api/v1/documents/:documentId/security/access-logs
 * @access  Private
 */
const getSecureViewingAccessLogsHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    
    // Get access logs
    const logs = await getSecureViewingAccessLogs(documentId);
    
    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyPasswordProtectionHandler,
  applyWatermarkHandler,
  generateSecureViewingLinkHandler,
  validateSecureViewingTokenHandler,
  getDocumentSecuritySettingsHandler,
  getSecureViewingLinksHandler,
  revokeSecureViewingLinkHandler,
  getSecureViewingAccessLogsHandler
};
