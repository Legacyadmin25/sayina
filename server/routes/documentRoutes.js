const express = require('express');
const { body, param } = require('express-validator');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const { validationErrorHandler } = require('../middleware/errorMiddleware');
const documentController = require('../controllers/documentController');
const pdfTranslationController = require('../controllers/pdfTranslationController');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);
router.use(verifiedEmail);

/**
 * @route   POST /api/v1/documents/upload/:envelopeId
 * @desc    Upload document to envelope
 * @access  Private
 */
router.post(
  '/upload/:envelopeId',
  [
    param('envelopeId').isUUID().withMessage('Invalid envelope ID format'),
    validationErrorHandler
  ],
  documentController.uploadDocument
);

/**
 * @route   GET /api/v1/documents/:id
 * @desc    Get document by ID
 * @access  Private
 */
router.get(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid document ID format'),
    validationErrorHandler
  ],
  documentController.getDocumentById
);

/**
 * @route   GET /api/v1/documents/:id/preview
 * @desc    Get document preview
 * @access  Private
 */
router.get(
  '/:id/preview',
  [
    param('id').isUUID().withMessage('Invalid document ID format'),
    validationErrorHandler
  ],
  documentController.getDocumentPreview
);

/**
 * @route   GET /api/v1/documents/:id/download
 * @desc    Download document
 * @access  Private
 */
router.get(
  '/:id/download',
  [
    param('id').isUUID().withMessage('Invalid document ID format'),
    validationErrorHandler
  ],
  documentController.downloadDocument
);

/**
 * @route   DELETE /api/v1/documents/:id
 * @desc    Delete document
 * @access  Private
 */
router.delete(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid document ID format'),
    validationErrorHandler
  ],
  documentController.deleteDocument
);

/**
 * @route   GET /api/v1/documents/:id/fields
 * @desc    Get document fields
 * @access  Private
 */
router.get(
  '/:id/fields',
  [
    param('id').isUUID().withMessage('Invalid document ID format'),
    validationErrorHandler
  ],
  documentController.getDocumentFields
);

/**
 * @route   POST /api/v1/documents/:id/translate
 * @desc    Translate a PDF document using OCR
 * @access  Private
 */
router.post(
  '/:id/translate',
  [
    param('id').isUUID().withMessage('Invalid document ID format'),
    body('targetLanguage').isString().withMessage('Target language is required'),
    validationErrorHandler
  ],
  pdfTranslationController.translatePdfDocument
);

/**
 * @route   GET /api/v1/documents/:id/signing/:signerId
 * @desc    Get document with fields for signing
 * @access  Private (but accessible via signing token)
 */
router.get(
  '/:id/signing/:signerId',
  [
    param('id').isUUID().withMessage('Invalid document ID format'),
    param('signerId').isUUID().withMessage('Invalid signer ID format'),
    validationErrorHandler
  ],
  documentController.getDocumentForSigning
);

module.exports = router;
