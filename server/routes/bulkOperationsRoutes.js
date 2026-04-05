const express = require('express');
const multer = require('multer');
const path = require('path');
const { protect, verifiedEmail, checkRole } = require('../middleware/authMiddleware');
const bulkOperationsController = require('../controllers/bulkOperationsController');

const router = express.Router();

// Configure multer for CSV file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, path.join(__dirname, '..', 'temp'));
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const csvFilter = (req, file, cb) => {
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: csvFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * @route   POST /api/v1/bulk/envelopes
 * @desc    Create bulk envelopes
 * @access  Private (org_admin)
 */
router.post(
  '/envelopes',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  bulkOperationsController.createBulkEnvelopes
);

/**
 * @route   POST /api/v1/bulk/envelopes/:envelopeId/documents
 * @desc    Upload bulk documents to envelope
 * @access  Private
 */
router.post(
  '/envelopes/:envelopeId/documents',
  protect,
  verifiedEmail,
  bulkOperationsController.uploadBulkDocuments
);

/**
 * @route   POST /api/v1/bulk/envelopes/:envelopeId/signers
 * @desc    Add bulk signers to envelope
 * @access  Private
 */
router.post(
  '/envelopes/:envelopeId/signers',
  protect,
  verifiedEmail,
  bulkOperationsController.addBulkSigners
);

/**
 * @route   POST /api/v1/bulk/envelopes/:envelopeId/import-signers
 * @desc    Import CSV signers to envelope
 * @access  Private
 */
router.post(
  '/envelopes/:envelopeId/import-signers',
  protect,
  verifiedEmail,
  upload.single('csv'),
  bulkOperationsController.importCsvSigners
);

/**
 * @route   GET /api/v1/bulk/operations/:operationId
 * @desc    Get bulk operation status
 * @access  Private
 */
router.get(
  '/operations/:operationId',
  protect,
  bulkOperationsController.getOperationStatus
);

/**
 * @route   GET /api/v1/bulk/operations
 * @desc    Get organization bulk operations
 * @access  Private
 */
router.get(
  '/operations',
  protect,
  bulkOperationsController.getOrganizationOperations
);

/**
 * @route   GET /api/v1/bulk/operations/:operationId/download
 * @desc    Download bulk operation results
 * @access  Private
 */
router.get(
  '/operations/:operationId/download',
  protect,
  bulkOperationsController.downloadOperationResults
);

module.exports = router;
