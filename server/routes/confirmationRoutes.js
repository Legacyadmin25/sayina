/**
 * Confirmation Routes
 * 
 * API routes for sending confirmation emails with compliance information
 * after documents are signed in the Sayina E-Signature platform.
 */

const express = require('express');
const { body, param } = require('express-validator');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const { validationErrorHandler } = require('../middleware/errorMiddleware');
const confirmationController = require('../controllers/confirmationController');

const router = express.Router();

/**
 * @route   POST /api/v1/envelopes/:id/send-confirmation
 * @desc    Send confirmation email after signing
 * @access  Private
 */
router.post(
  '/envelopes/:id/send-confirmation',
  protect,
  verifiedEmail,
  [
    param('id').isUUID().withMessage('Invalid envelope ID format'),
    body('recipientType').optional().isIn(['owner', 'signer', 'all']).withMessage('Recipient type must be "owner", "signer", or "all"'),
    body('signerId').optional().isUUID().withMessage('Invalid signer ID format'),
    body('includeAudit').optional().isBoolean().withMessage('Include audit must be a boolean'),
    validationErrorHandler
  ],
  confirmationController.sendConfirmationEmail
);

/**
 * @route   POST /api/v1/envelopes/:id/send-all-confirmations
 * @desc    Send all confirmation emails after envelope is completed
 * @access  Private
 */
router.post(
  '/envelopes/:id/send-all-confirmations',
  protect,
  verifiedEmail,
  [
    param('id').isUUID().withMessage('Invalid envelope ID format'),
    validationErrorHandler
  ],
  confirmationController.sendAllConfirmationEmails
);

/**
 * @route   POST /api/v1/envelopes/:id/send-owner-confirmation
 * @desc    Send owner confirmation email
 * @access  Private
 */
router.post(
  '/envelopes/:id/send-owner-confirmation',
  protect,
  verifiedEmail,
  [
    param('id').isUUID().withMessage('Invalid envelope ID format'),
    body('includeAudit').optional().isBoolean().withMessage('Include audit must be a boolean'),
    validationErrorHandler
  ],
  confirmationController.sendOwnerConfirmationEmail
);

/**
 * @route   POST /api/v1/envelopes/:id/signers/:signerId/send-confirmation
 * @desc    Send signer confirmation email
 * @access  Private
 */
router.post(
  '/envelopes/:id/signers/:signerId/send-confirmation',
  protect,
  verifiedEmail,
  [
    param('id').isUUID().withMessage('Invalid envelope ID format'),
    param('signerId').isUUID().withMessage('Invalid signer ID format'),
    validationErrorHandler
  ],
  confirmationController.sendSignerConfirmationEmail
);

module.exports = router;
