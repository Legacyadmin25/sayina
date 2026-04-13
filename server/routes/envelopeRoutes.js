const express = require('express');
const { body, param } = require('express-validator');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const { validationErrorHandler } = require('../middleware/errorMiddleware');
const envelopeController = require('../controllers/envelopeController');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);
router.use(verifiedEmail);

/**
 * @route   POST /api/v1/envelopes
 * @desc    Create a new envelope
 * @access  Private
 */
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Envelope name is required'),
    body('message').optional().trim(),
    body('expiry_days').optional().isInt({ min: 1, max: 90 }).withMessage('Expiry days must be between 1 and 90'),
    validationErrorHandler
  ],
  envelopeController.createEnvelope
);

/**
 * @route   GET /api/v1/envelopes
 * @desc    Get all envelopes for organization
 * @access  Private
 */
router.get('/', envelopeController.getEnvelopes);

/**
 * @route   GET /api/v1/envelopes/:id
 * @desc    Get envelope by ID
 * @access  Private
 */
router.get(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid envelope ID format'),
    validationErrorHandler
  ],
  envelopeController.getEnvelopeById
);

/**
 * @route   PUT /api/v1/envelopes/:id
 * @desc    Update envelope
 * @access  Private
 */
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid envelope ID format'),
    body('name').optional().trim().notEmpty().withMessage('Envelope name cannot be empty'),
    body('message').optional().trim(),
    body('expiry_days').optional().isInt({ min: 1, max: 90 }).withMessage('Expiry days must be between 1 and 90'),
    validationErrorHandler
  ],
  envelopeController.updateEnvelope
);

/**
 * @route   DELETE /api/v1/envelopes/:id
 * @desc    Delete envelope
 * @access  Private
 */
router.delete(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid envelope ID format'),
    validationErrorHandler
  ],
  envelopeController.deleteEnvelope
);

/**
 * @route   POST /api/v1/envelopes/:id/signers
 * @desc    Add signer to envelope
 * @access  Private
 */
router.post(
  '/:id/signers',
  [
    param('id').isUUID().withMessage('Invalid envelope ID format'),
    // Allow batch { signers: [...] } OR single { email, first_name, last_name }
    // Full validation is done inside the controller to support both shapes
    validationErrorHandler
  ],
  envelopeController.addSigner
);

/**
 * @route   DELETE /api/v1/envelopes/:id/signers/:signerId
 * @desc    Remove signer from envelope
 * @access  Private
 */
router.delete(
  '/:id/signers/:signerId',
  [
    param('id').isUUID().withMessage('Invalid envelope ID format'),
    param('signerId').isUUID().withMessage('Invalid signer ID format'),
    validationErrorHandler
  ],
  envelopeController.removeSigner
);

/**
 * @route   POST /api/v1/envelopes/:id/send
 * @desc    Send envelope to signers
 * @access  Private
 */
router.post(
  '/:id/send',
  [
    param('id').isUUID().withMessage('Invalid envelope ID format'),
    validationErrorHandler
  ],
  envelopeController.sendEnvelope
);

/**
 * @route   POST /api/v1/envelopes/:id/cancel
 * @desc    Cancel envelope
 * @access  Private
 */
router.post(
  '/:id/cancel',
  [
    param('id').isUUID().withMessage('Invalid envelope ID format'),
    validationErrorHandler
  ],
  envelopeController.cancelEnvelope
);

/**
 * @route   GET /api/v1/envelopes/:id/status
 * @desc    Get envelope signing status
 * @access  Private
 */
router.get(
  '/:id/status',
  [
    param('id').isUUID().withMessage('Invalid envelope ID format'),
    validationErrorHandler
  ],
  envelopeController.getEnvelopeStatus
);

module.exports = router;
