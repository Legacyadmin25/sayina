const express = require('express');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const aiDocumentController = require('../controllers/aiDocumentController');

const router = express.Router();

/**
 * Document Analysis Routes
 */

/**
 * @route   POST /api/v1/ai/documents/:documentId/analyze-fields
 * @desc    Analyze document for automatic field detection
 * @access  Private
 */
router.post(
  '/documents/:documentId/analyze-fields',
  protect,
  aiDocumentController.analyzeDocumentForFieldsHandler
);

/**
 * @route   POST /api/v1/ai/documents/:documentId/classify
 * @desc    Classify document
 * @access  Private
 */
router.post(
  '/documents/:documentId/classify',
  protect,
  aiDocumentController.classifyDocumentHandler
);

/**
 * @route   POST /api/v1/ai/documents/:documentId/apply-fields
 * @desc    Apply detected fields to document
 * @access  Private
 */
router.post(
  '/documents/:documentId/apply-fields',
  protect,
  aiDocumentController.applyDetectedFieldsHandler
);

/**
 * Anomaly Detection Routes
 */

/**
 * @route   POST /api/v1/ai/envelopes/:envelopeId/detect-anomalies
 * @desc    Detect signing anomalies
 * @access  Private
 */
router.post(
  '/envelopes/:envelopeId/detect-anomalies',
  protect,
  verifiedEmail,
  aiDocumentController.detectSigningAnomaliesHandler
);

/**
 * Predictive Analytics Routes
 */

/**
 * @route   POST /api/v1/ai/analytics/predictive
 * @desc    Generate predictive analytics
 * @access  Private
 */
router.post(
  '/analytics/predictive',
  protect,
  verifiedEmail,
  aiDocumentController.generatePredictiveAnalyticsHandler
);

/**
 * Analysis Results Routes
 */

/**
 * @route   GET /api/v1/ai/analyses/:analysisId
 * @desc    Get document analysis
 * @access  Private
 */
router.get(
  '/analyses/:analysisId',
  protect,
  aiDocumentController.getDocumentAnalysisHandler
);

module.exports = router;
