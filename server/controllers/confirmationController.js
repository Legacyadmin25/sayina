/**
 * Confirmation Controller
 * 
 * This controller handles sending confirmation emails after document signing,
 * including compliance information and document attachments.
 */

const { validationResult } = require('express-validator');
const { ApiError } = require('../middleware/errorMiddleware');
const emailConfirmationService = require('../services/emailConfirmationService');
const logger = require('../config/winston');

/**
 * @desc    Send confirmation email after signing
 * @route   POST /api/v1/envelopes/:id/send-confirmation
 * @access  Private
 */
const sendConfirmationEmail = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { id: envelopeId } = req.params;
    const { recipientType = 'all', signerId, includeAudit = false } = req.body;
    
    // Send confirmation email(s)
    const result = await emailConfirmationService.sendConfirmationEmail(
      envelopeId, 
      { recipientType, signerId, includeAudit }
    );
    
    logger.info(`Confirmation email(s) sent for envelope ${envelopeId}`, { 
      recipientType,
      signerId,
      includeAudit
    });
    
    return res.status(200).json({
      status: 'success',
      message: 'Confirmation email(s) sent successfully',
      data: result
    });
  } catch (error) {
    logger.error(`Error sending confirmation email: ${error.message}`, { error });
    return next(new ApiError(500, error.message));
  }
};

/**
 * @desc    Send all confirmation emails after envelope is completed
 * @route   POST /api/v1/envelopes/:id/send-all-confirmations
 * @access  Private
 */
const sendAllConfirmationEmails = async (req, res, next) => {
  try {
    const { id: envelopeId } = req.params;
    
    // Send all confirmation emails
    const result = await emailConfirmationService.sendAllConfirmationEmails(envelopeId);
    
    logger.info(`All confirmation emails sent for envelope ${envelopeId}`);
    
    return res.status(200).json({
      status: 'success',
      message: 'All confirmation emails sent successfully',
      data: result
    });
  } catch (error) {
    logger.error(`Error sending all confirmation emails: ${error.message}`, { error });
    return next(new ApiError(500, error.message));
  }
};

/**
 * @desc    Send owner confirmation email
 * @route   POST /api/v1/envelopes/:id/send-owner-confirmation
 * @access  Private
 */
const sendOwnerConfirmationEmail = async (req, res, next) => {
  try {
    const { id: envelopeId } = req.params;
    const { includeAudit = true } = req.body;
    
    // Send owner confirmation email
    const result = await emailConfirmationService.sendOwnerConfirmationEmail(
      envelopeId, 
      { includeAudit }
    );
    
    logger.info(`Owner confirmation email sent for envelope ${envelopeId}`);
    
    return res.status(200).json({
      status: 'success',
      message: 'Owner confirmation email sent successfully',
      data: result
    });
  } catch (error) {
    logger.error(`Error sending owner confirmation email: ${error.message}`, { error });
    return next(new ApiError(500, error.message));
  }
};

/**
 * @desc    Send signer confirmation email
 * @route   POST /api/v1/envelopes/:id/signers/:signerId/send-confirmation
 * @access  Private
 */
const sendSignerConfirmationEmail = async (req, res, next) => {
  try {
    const { id: envelopeId, signerId } = req.params;
    
    // Send signer confirmation email
    const result = await emailConfirmationService.sendSignerConfirmationEmail(
      envelopeId, 
      signerId
    );
    
    logger.info(`Signer confirmation email sent for envelope ${envelopeId}, signer ${signerId}`);
    
    return res.status(200).json({
      status: 'success',
      message: 'Signer confirmation email sent successfully',
      data: result
    });
  } catch (error) {
    logger.error(`Error sending signer confirmation email: ${error.message}`, { error });
    return next(new ApiError(500, error.message));
  }
};

module.exports = {
  sendConfirmationEmail,
  sendAllConfirmationEmails,
  sendOwnerConfirmationEmail,
  sendSignerConfirmationEmail
};
