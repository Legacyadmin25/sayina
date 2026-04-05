const { validationResult } = require('express-validator');
const { db } = require('../config/db');
const { ApiError } = require('../middleware/errorMiddleware');
const { 
  generateAndStoreOTP, 
  verifyUserOTP, 
  generateSigningOTP, 
  verifySigningOTP: verifySigningOTPService 
} = require('../services/otpService');

/**
 * @desc    Send OTP for general verification
 * @route   POST /api/v1/otp/send
 * @access  Private
 */
const sendOTP = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { method, destination, purpose } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Validate method
    if (!['sms', 'email'].includes(method)) {
      return next(new ApiError(400, 'Invalid method. Must be either sms or email'));
    }

    // Validate purpose
    if (!['verification', 'login', 'transaction'].includes(purpose)) {
      return next(new ApiError(400, 'Invalid purpose. Must be verification, login, or transaction'));
    }

    // Check if SMS credits are available for SMS method
    if (method === 'sms') {
      const organization = await db('organizations')
        .where({ id: orgId })
        .select('sms_credits')
        .first();

      if (!organization) {
        return next(new ApiError(404, 'Organization not found'));
      }

      if (organization.sms_credits <= 0) {
        return next(new ApiError(400, 'Not enough SMS credits. Please top up your SMS credits'));
      }
    }

    // Generate and send OTP
    const result = await generateAndStoreOTP(userId, method, destination);

    if (!result.success) {
      return next(new ApiError(500, result.message));
    }

    // Log OTP request
    await db('system_logs').insert({
      user_id: userId,
      action: 'otp_requested',
      metadata: JSON.stringify({
        method,
        purpose,
        destination: method === 'email' 
          ? destination 
          : destination.replace(/\d(?=\d{4})/g, '*') // Mask phone number
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: `OTP sent successfully via ${method}`,
      data: {
        expires_in: result.expiresIn
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify OTP for general verification
 * @route   POST /api/v1/otp/verify
 * @access  Private
 */
const verifyOTP = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { method, destination, otp, purpose } = req.body;
    const userId = req.user.id;

    // Validate method
    if (!['sms', 'email'].includes(method)) {
      return next(new ApiError(400, 'Invalid method. Must be either sms or email'));
    }

    // Validate purpose
    if (!['verification', 'login', 'transaction'].includes(purpose)) {
      return next(new ApiError(400, 'Invalid purpose. Must be verification, login, or transaction'));
    }

    // Verify OTP
    const result = await verifyUserOTP(userId, method, destination, otp);

    if (!result.success) {
      return next(new ApiError(400, result.message));
    }

    // Log OTP verification
    await db('system_logs').insert({
      user_id: userId,
      action: 'otp_verified',
      metadata: JSON.stringify({
        method,
        purpose,
        destination: method === 'email' 
          ? destination 
          : destination.replace(/\d(?=\d{4})/g, '*') // Mask phone number
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send OTP for document signing
 * @route   POST /api/v1/otp/signing/send
 * @access  Public
 */
const sendSigningOTP = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { method, destination, signer_id, envelope_id } = req.body;

    // Validate method
    if (!['sms', 'email'].includes(method)) {
      return next(new ApiError(400, 'Invalid method. Must be either sms or email'));
    }

    // Validate signer and envelope
    const signer = await db('signers')
      .where({ id: signer_id, envelope_id })
      .select('id', 'email', 'status')
      .first();

    if (!signer) {
      return next(new ApiError(404, 'Signer not found for this envelope'));
    }

    // Check if signer is in the correct status
    if (signer.status !== 'current') {
      return next(new ApiError(400, 'Signer is not currently active for signing'));
    }

    // Check envelope status
    const envelope = await db('envelopes')
      .where({ id: envelope_id })
      .select('status', 'org_id')
      .first();

    if (!envelope) {
      return next(new ApiError(404, 'Envelope not found'));
    }

    if (!['sent', 'in_progress'].includes(envelope.status)) {
      return next(new ApiError(400, 'Envelope is not available for signing'));
    }

    // Check if organization has SMS credits for SMS method
    if (method === 'sms') {
      const organization = await db('organizations')
        .where({ id: envelope.org_id })
        .select('sms_credits')
        .first();

      if (organization.sms_credits <= 0) {
        return next(new ApiError(400, 'The organization does not have enough SMS credits'));
      }
    }

    // Generate and send OTP
    const result = await generateSigningOTP(signer_id, envelope_id, method, destination);

    if (!result.success) {
      return next(new ApiError(500, result.message));
    }

    res.status(200).json({
      success: true,
      message: `Signing OTP sent successfully via ${method}`,
      data: {
        expires_in: result.expiresIn
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify OTP for document signing
 * @route   POST /api/v1/otp/signing/verify
 * @access  Public
 */
const verifySigningOTP = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { otp, signer_id, envelope_id } = req.body;

    // Validate signer and envelope
    const signer = await db('signers')
      .where({ id: signer_id, envelope_id })
      .select('id', 'status')
      .first();

    if (!signer) {
      return next(new ApiError(404, 'Signer not found for this envelope'));
    }

    // Check if signer is in the correct status
    if (signer.status !== 'current') {
      return next(new ApiError(400, 'Signer is not currently active for signing'));
    }

    // Check envelope status
    const envelope = await db('envelopes')
      .where({ id: envelope_id })
      .select('status')
      .first();

    if (!envelope) {
      return next(new ApiError(404, 'Envelope not found'));
    }

    if (!['sent', 'in_progress'].includes(envelope.status)) {
      return next(new ApiError(400, 'Envelope is not available for signing'));
    }

    // Verify OTP
    const result = await verifySigningOTPService(signer_id, envelope_id, otp);

    if (!result.success) {
      return next(new ApiError(400, result.message));
    }

    res.status(200).json({
      success: true,
      message: 'Signing OTP verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendOTP,
  verifyOTP,
  sendSigningOTP,
  verifySigningOTP
};
