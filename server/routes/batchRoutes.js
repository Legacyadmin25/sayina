const express = require('express');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const batchProcessingController = require('../controllers/batchProcessingController');

const router = express.Router();

/**
 * @route   POST /api/v1/batch/envelopes
 * @desc    Create batch envelopes
 * @access  Private
 */
router.post(
  '/envelopes',
  protect,
  verifiedEmail,
  batchProcessingController.createBatchEnvelopes
);

/**
 * @route   POST /api/v1/batch/envelopes/:envelopeId/documents
 * @desc    Add batch documents to envelope
 * @access  Private
 */
router.post(
  '/envelopes/:envelopeId/documents',
  protect,
  verifiedEmail,
  batchProcessingController.addBatchDocuments
);

/**
 * @route   POST /api/v1/batch/envelopes/:envelopeId/signers
 * @desc    Add batch signers to envelope
 * @access  Private
 */
router.post(
  '/envelopes/:envelopeId/signers',
  protect,
  verifiedEmail,
  batchProcessingController.addBatchSigners
);

/**
 * @route   GET /api/v1/batch/:batchId
 * @desc    Get batch operation status
 * @access  Private
 */
router.get(
  '/:batchId',
  protect,
  batchProcessingController.getBatchStatus
);

/**
 * @route   GET /api/v1/batch
 * @desc    Get organization batch operations
 * @access  Private
 */
router.get(
  '/',
  protect,
  batchProcessingController.getBatchOperations
);

/**
 * @route   GET /api/v1/batch/:batchId/download
 * @desc    Download batch operation results as CSV
 * @access  Private
 */
router.get(
  '/:batchId/download',
  protect,
  batchProcessingController.downloadBatchResults
);

/**
 * @route   GET /api/v1/batch/:batchId/download/json
 * @desc    Download batch operation results as JSON
 * @access  Private
 */
router.get(
  '/:batchId/download/json',
  protect,
  batchProcessingController.downloadBatchResultsJson
);

/**
 * @route   GET /api/v1/batch/template/:type
 * @desc    Get batch operation template CSV
 * @access  Private
 */
router.get(
  '/template/:type',
  protect,
  batchProcessingController.getBatchTemplate
);

module.exports = router;
