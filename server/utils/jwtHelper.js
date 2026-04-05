const jwt = require('jsonwebtoken');
const { ApiError } = require('../middleware/errorMiddleware');

/**
 * Generate JWT token
 * @param {string} userId - User ID
 * @returns {string} - JWT token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '1h' }
  );
};

/**
 * Generate refresh token
 * @param {string} userId - User ID
 * @returns {string} - Refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} - Decoded token
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired token');
  }
};

/**
 * Verify refresh token
 * @param {string} token - Refresh token
 * @returns {Object} - Decoded token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }
};

/**
 * Generate API key
 * @param {string} orgId - Organization ID
 * @param {string} userId - User ID
 * @param {Object} permissions - API permissions
 * @returns {string} - API key
 */
const generateApiKey = (orgId, userId, permissions = {}) => {
  return jwt.sign(
    {
      org_id: orgId,
      user_id: userId,
      permissions,
      type: 'api_key'
    },
    process.env.JWT_API_SECRET,
    { expiresIn: process.env.JWT_API_EXPIRY || '365d' }
  );
};

/**
 * Verify API key
 * @param {string} apiKey - API key
 * @returns {Object} - Decoded API key
 */
const verifyApiKey = (apiKey) => {
  try {
    const decoded = jwt.verify(apiKey, process.env.JWT_API_SECRET);
    
    // Ensure it's an API key
    if (decoded.type !== 'api_key') {
      throw new Error('Invalid API key');
    }
    
    return decoded;
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired API key');
  }
};

/**
 * Generate signing token
 * @param {string} envelopeId - Envelope ID
 * @param {string} signerId - Signer ID
 * @param {string} accessToken - Access token
 * @returns {string} - Signing token
 */
const generateSigningToken = (envelopeId, signerId, accessToken) => {
  return jwt.sign(
    {
      envelope_id: envelopeId,
      signer_id: signerId,
      access_token: accessToken,
      type: 'signing'
    },
    process.env.JWT_SIGNING_SECRET,
    { expiresIn: process.env.JWT_SIGNING_EXPIRY || '24h' }
  );
};

/**
 * Verify signing token
 * @param {string} token - Signing token
 * @returns {Object} - Decoded signing token
 */
const verifySigningToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SIGNING_SECRET);
    
    // Ensure it's a signing token
    if (decoded.type !== 'signing') {
      throw new Error('Invalid signing token');
    }
    
    return decoded;
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired signing token');
  }
};

/**
 * Generate password reset token
 * @param {string} userId - User ID
 * @returns {string} - Password reset token
 */
const generatePasswordResetToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'password_reset' },
    process.env.JWT_RESET_SECRET,
    { expiresIn: process.env.JWT_RESET_EXPIRY || '1h' }
  );
};

/**
 * Verify password reset token
 * @param {string} token - Password reset token
 * @returns {Object} - Decoded password reset token
 */
const verifyPasswordResetToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);
    
    // Ensure it's a password reset token
    if (decoded.type !== 'password_reset') {
      throw new Error('Invalid password reset token');
    }
    
    return decoded;
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired password reset token');
  }
};

/**
 * Generate email verification token
 * @param {string} userId - User ID
 * @returns {string} - Email verification token
 */
const generateEmailVerificationToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'email_verification' },
    process.env.JWT_VERIFICATION_SECRET,
    { expiresIn: process.env.JWT_VERIFICATION_EXPIRY || '24h' }
  );
};

/**
 * Verify email verification token
 * @param {string} token - Email verification token
 * @returns {Object} - Decoded email verification token
 */
const verifyEmailVerificationToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_VERIFICATION_SECRET);
    
    // Ensure it's an email verification token
    if (decoded.type !== 'email_verification') {
      throw new Error('Invalid email verification token');
    }
    
    return decoded;
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired email verification token');
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  generateApiKey,
  verifyApiKey,
  generateSigningToken,
  verifySigningToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  generateEmailVerificationToken,
  verifyEmailVerificationToken
};
