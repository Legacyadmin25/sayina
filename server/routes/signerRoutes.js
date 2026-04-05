const express = require('express');
const { body, param, query } = require('express-validator');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const { validationErrorHandler } = require('../middleware/errorMiddleware');
const signerController = require('../controllers/signerController');

const router = express.Router();

/**
 * @route   POST /api/v1/signers
 * @desc    Add signer to envelope
 * @access  Private
 */
router.post(
  '/',
  protect,
  verifiedEmail,
  [
    body('envelope_id').isUUID().withMessage('Invalid envelope ID format'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('phone').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
    body('role').isIn(['signer', 'approver', 'viewer', 'cc']).withMessage('Role must be signer, approver, viewer, or cc'),
    body('signing_order').optional().isInt({ min: 1 }).withMessage('Signing order must be a positive integer'),
    body('message').optional(),
    validationErrorHandler
  ],
  signerController.addSigner
);

/**
 * @route   PUT /api/v1/signers/:id
 * @desc    Update signer
 * @access  Private
 */
router.put(
  '/:id',
  protect,
  verifiedEmail,
  [
    param('id').isUUID().withMessage('Invalid signer ID format'),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Please provide a valid email'),
    body('phone').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
    body('role').optional().isIn(['signer', 'approver', 'viewer', 'cc']).withMessage('Role must be signer, approver, viewer, or cc'),
    body('signing_order').optional().isInt({ min: 1 }).withMessage('Signing order must be a positive integer'),
    body('message').optional(),
    validationErrorHandler
  ],
  signerController.updateSigner
);

/**
 * @route   DELETE /api/v1/signers/:id
 * @desc    Delete signer
 * @access  Private
 */
router.delete(
  '/:id',
  protect,
  verifiedEmail,
  [
    param('id').isUUID().withMessage('Invalid signer ID format'),
    validationErrorHandler
  ],
  signerController.deleteSigner
);

/**
 * @route   GET /api/v1/signers/envelope/:envelopeId
 * @desc    Get signers for envelope
 * @access  Private
 */
router.get(
  '/envelope/:envelopeId',
  protect,
  [
    param('envelopeId').isUUID().withMessage('Invalid envelope ID format'),
    validationErrorHandler
  ],
  signerController.getEnvelopeSigners
);

/**
 * @route   POST /api/v1/signers/:id/remind
 * @desc    Send reminder to signer
 * @access  Private
 */
router.post(
  '/:id/remind',
  protect,
  verifiedEmail,
  [
    param('id').isUUID().withMessage('Invalid signer ID format'),
    body('custom_message').optional(),
    validationErrorHandler
  ],
  signerController.sendReminder
);

/**
 * @route   GET /api/v1/signers/:id/signing-url
 * @desc    Get signing URL for signer
 * @access  Private
 */
router.get(
  '/:id/signing-url',
  protect,
  [
    param('id').isUUID().withMessage('Invalid signer ID format'),
    validationErrorHandler
  ],
  signerController.getSigningUrl
);

/**
 * @route   GET /api/v1/signers/validate-token
 * @desc    Validate signer access token
 * @access  Public
 */
router.get(
  '/validate-token',
  [
    query('envelope_id').isUUID().withMessage('Invalid envelope ID format'),
    query('signer_id').isUUID().withMessage('Invalid signer ID format'),
    query('token').notEmpty().withMessage('Token is required'),
    validationErrorHandler
  ],
  signerController.validateToken
);

module.exports = router;
