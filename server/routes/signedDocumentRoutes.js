/**
 * Signed Document Routes
 * 
 * Routes for handling signed documents, including downloads and audit trails.
 */

const express = require('express');
const { param } = require('express-validator');
const { protect, protectOrSigner } = require('../middleware/authMiddleware');
const { validationErrorHandler } = require('../middleware/errorMiddleware');
const signedDocumentController = require('../controllers/signedDocumentController');

const router = express.Router();

/**
 * @route   GET /api/v1/signed-documents/:envelopeId/download
 * @desc    Download signed document with compliance verification
 * @access  Private (Organization members or signers)
 */
router.get(
  '/:envelopeId/download',
  protectOrSigner,
  [
    param('envelopeId').isUUID().withMessage('Invalid envelope ID format'),
    validationErrorHandler
  ],
  signedDocumentController.downloadSignedDocument
);

/**
 * @route   GET /api/v1/signed-documents/:envelopeId/audit
 * @desc    Get envelope audit trail
 * @access  Private (Organization members or signers)
 */
router.get(
  '/:envelopeId/audit',
  protectOrSigner,
  [
    param('envelopeId').isUUID().withMessage('Invalid envelope ID format'),
    validationErrorHandler
  ],
  signedDocumentController.getEnvelopeAuditTrail
);

module.exports = router;
