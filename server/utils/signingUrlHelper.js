const crypto = require('crypto');
const { generateSigningToken, verifySigningToken } = require('./jwtHelper');

/**
 * Generate a unique signing URL for a signer
 * @param {string} envelopeId - Envelope ID
 * @param {string} signerId - Signer ID
 * @param {Object} options - Additional options
 * @returns {Object} - Signing URL and token
 */
const generateSigningUrl = (envelopeId, signerId, options = {}) => {
  try {
    const {
      baseUrl = process.env.CLIENT_URL,
      expiryHours = 24,
      accessToken = crypto.randomBytes(32).toString('hex')
    } = options;

    // Generate signing token
    const token = generateSigningToken(envelopeId, signerId, accessToken);

    // Create signing URL
    const signingUrl = `${baseUrl}/sign/${token}`;

    return {
      success: true,
      url: signingUrl,
      token,
      accessToken
    };
  } catch (error) {
    console.error('Error generating signing URL:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate signing URL'
    };
  }
};

/**
 * Validate a signing token
 * @param {string} token - Signing token
 * @returns {Object} - Validation result
 */
const validateSigningToken = (token) => {
  try {
    // Verify token
    const decoded = verifySigningToken(token);

    return {
      success: true,
      envelopeId: decoded.envelope_id,
      signerId: decoded.signer_id,
      accessToken: decoded.access_token
    };
  } catch (error) {
    console.error('Error validating signing token:', error);
    return {
      success: false,
      error: error.message || 'Invalid or expired signing token'
    };
  }
};

/**
 * Generate a completion certificate URL
 * @param {string} envelopeId - Envelope ID
 * @param {Object} options - Additional options
 * @returns {string} - Certificate URL
 */
const generateCertificateUrl = (envelopeId, options = {}) => {
  try {
    const {
      baseUrl = process.env.CLIENT_URL,
      expiryHours = 72
    } = options;

    // Generate certificate token (simple hash for now)
    const timestamp = Date.now();
    const tokenData = `${envelopeId}:${timestamp}:${process.env.JWT_SECRET}`;
    const token = crypto.createHash('sha256').update(tokenData).digest('hex');

    // Create certificate URL
    const certificateUrl = `${baseUrl}/certificate/${envelopeId}?token=${token}`;

    return {
      success: true,
      url: certificateUrl,
      token
    };
  } catch (error) {
    console.error('Error generating certificate URL:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate certificate URL'
    };
  }
};

/**
 * Generate a download URL for a signed document
 * @param {string} documentId - Document ID
 * @param {Object} options - Additional options
 * @returns {string} - Download URL
 */
const generateDocumentDownloadUrl = (documentId, options = {}) => {
  try {
    const {
      baseUrl = process.env.API_URL,
      expiryMinutes = 30
    } = options;

    // Generate expiry timestamp
    const expiryTimestamp = Date.now() + (expiryMinutes * 60 * 1000);
    
    // Generate download token
    const tokenData = `${documentId}:${expiryTimestamp}:${process.env.JWT_SECRET}`;
    const token = crypto.createHash('sha256').update(tokenData).digest('hex');

    // Create download URL
    const downloadUrl = `${baseUrl}/api/documents/${documentId}/download?token=${token}&expires=${expiryTimestamp}`;

    return {
      success: true,
      url: downloadUrl,
      expiresAt: new Date(expiryTimestamp)
    };
  } catch (error) {
    console.error('Error generating document download URL:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate document download URL'
    };
  }
};

/**
 * Validate a document download token
 * @param {string} documentId - Document ID
 * @param {string} token - Download token
 * @param {number} expiryTimestamp - Expiry timestamp
 * @returns {boolean} - True if token is valid
 */
const validateDocumentDownloadToken = (documentId, token, expiryTimestamp) => {
  try {
    // Check if token has expired
    if (Date.now() > expiryTimestamp) {
      return false;
    }

    // Generate expected token
    const expectedTokenData = `${documentId}:${expiryTimestamp}:${process.env.JWT_SECRET}`;
    const expectedToken = crypto.createHash('sha256').update(expectedTokenData).digest('hex');

    // Compare tokens
    return token === expectedToken;
  } catch (error) {
    console.error('Error validating document download token:', error);
    return false;
  }
};

/**
 * Generate an audit trail download URL
 * @param {string} envelopeId - Envelope ID
 * @param {Object} options - Additional options
 * @returns {string} - Audit trail URL
 */
const generateAuditTrailUrl = (envelopeId, options = {}) => {
  try {
    const {
      baseUrl = process.env.API_URL,
      expiryMinutes = 30
    } = options;

    // Generate expiry timestamp
    const expiryTimestamp = Date.now() + (expiryMinutes * 60 * 1000);
    
    // Generate audit trail token
    const tokenData = `audit:${envelopeId}:${expiryTimestamp}:${process.env.JWT_SECRET}`;
    const token = crypto.createHash('sha256').update(tokenData).digest('hex');

    // Create audit trail URL
    const auditTrailUrl = `${baseUrl}/api/envelopes/${envelopeId}/audit?token=${token}&expires=${expiryTimestamp}`;

    return {
      success: true,
      url: auditTrailUrl,
      expiresAt: new Date(expiryTimestamp)
    };
  } catch (error) {
    console.error('Error generating audit trail URL:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate audit trail URL'
    };
  }
};

module.exports = {
  generateSigningUrl,
  validateSigningToken,
  generateCertificateUrl,
  generateDocumentDownloadUrl,
  validateDocumentDownloadToken,
  generateAuditTrailUrl
};
