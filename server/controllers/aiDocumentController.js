/**
 * AI Document Analysis Controller
 * 
 * This controller handles AI-powered document analysis features for the Sayina E-Signature platform,
 * including automatic field detection, document classification, and anomaly detection.
 */

const { ApiError } = require('../middleware/errorMiddleware');
const {
  analyzeDocumentForFields,
  classifyDocument,
  detectSigningAnomalies,
  generatePredictiveAnalytics,
  applyDetectedFields,
  getDocumentAnalysis
} = require('../services/aiDocumentService');
const { logSystemEvent } = require('../services/loggerService');

/**
 * @desc    Analyze document for automatic field detection
 * @route   POST /api/v1/ai/documents/:documentId/analyze-fields
 * @access  Private
 */
const analyzeDocumentForFieldsHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const {
      field_types,
      confidence_threshold,
      max_fields_per_page
    } = req.body;
    
    const userId = req.user.id;
    
    // Analyze document
    const analysisResults = await analyzeDocumentForFields(documentId, {
      field_types,
      confidence_threshold,
      max_fields_per_page
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'document_field_analysis',
      metadata: {
        document_id: documentId,
        analysis_id: analysisResults.analysis_id,
        fields_detected: analysisResults.detected_fields.length
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Document analyzed successfully',
      data: analysisResults
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Classify document
 * @route   POST /api/v1/ai/documents/:documentId/classify
 * @access  Private
 */
const classifyDocumentHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    
    const userId = req.user.id;
    
    // Classify document
    const classificationResults = await classifyDocument(documentId);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'document_classification',
      metadata: {
        document_id: documentId,
        classification_id: classificationResults.classification_id,
        classification: classificationResults.classification
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Document classified successfully',
      data: classificationResults
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Detect signing anomalies
 * @route   POST /api/v1/ai/envelopes/:envelopeId/detect-anomalies
 * @access  Private
 */
const detectSigningAnomaliesHandler = async (req, res, next) => {
  try {
    const { envelopeId } = req.params;
    
    const userId = req.user.id;
    
    // Detect anomalies
    const detectionResults = await detectSigningAnomalies(envelopeId);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'signing_anomaly_detection',
      metadata: {
        envelope_id: envelopeId,
        detection_id: detectionResults.detection_id,
        anomalies_detected: detectionResults.anomalies.length
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Signing anomalies detected successfully',
      data: detectionResults
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate predictive analytics
 * @route   POST /api/v1/ai/analytics/predictive
 * @access  Private
 */
const generatePredictiveAnalyticsHandler = async (req, res, next) => {
  try {
    const {
      start_date,
      end_date,
      document_types
    } = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Generate analytics
    const analyticsResults = await generatePredictiveAnalytics(orgId, {
      start_date,
      end_date,
      document_types
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'predictive_analytics_generated',
      metadata: {
        analysis_id: analyticsResults.analysis_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Predictive analytics generated successfully',
      data: analyticsResults
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Apply detected fields to document
 * @route   POST /api/v1/ai/documents/:documentId/apply-fields
 * @access  Private
 */
const applyDetectedFieldsHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const {
      analysis_id,
      selected_fields
    } = req.body;
    
    const userId = req.user.id;
    
    // Validate required fields
    if (!analysis_id || !selected_fields) {
      return next(new ApiError(400, 'Analysis ID and selected fields are required'));
    }
    
    // Apply fields
    const applicationResults = await applyDetectedFields(documentId, analysis_id, selected_fields);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'detected_fields_applied',
      metadata: {
        document_id: documentId,
        analysis_id,
        fields_applied: applicationResults.fields_count
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Detected fields applied successfully',
      data: applicationResults
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get document analysis
 * @route   GET /api/v1/ai/analyses/:analysisId
 * @access  Private
 */
const getDocumentAnalysisHandler = async (req, res, next) => {
  try {
    const { analysisId } = req.params;
    
    // Get analysis
    const analysis = await getDocumentAnalysis(analysisId);
    
    res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  analyzeDocumentForFieldsHandler,
  classifyDocumentHandler,
  detectSigningAnomaliesHandler,
  generatePredictiveAnalyticsHandler,
  applyDetectedFieldsHandler,
  getDocumentAnalysisHandler
};
