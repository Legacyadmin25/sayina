/**
 * Compliance Controller
 * 
 * This controller handles compliance tracking and reporting for the Sayina E-Signature platform,
 * ensuring adherence to South African e-signature regulations (ECT Act).
 */

const { ApiError } = require('../middleware/errorMiddleware');
const { 
  trackComplianceEvent,
  assessEnvelopeCompliance,
  generateComplianceReport,
  getComplianceAssessment,
  getComplianceReport,
  getOrganizationComplianceReports
} = require('../services/complianceTrackingService');
const { logSystemEvent } = require('../services/loggerService');
const db = require('../config/db');

/**
 * @desc    Assess envelope compliance
 * @route   POST /api/v1/compliance/assess/envelope/:id
 * @access  Private
 */
const assessEnvelopeComplianceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Check if envelope exists and belongs to organization
    const envelope = await db('envelopes')
      .where('id', id)
      .where('org_id', orgId)
      .first();
    
    if (!envelope) {
      return next(new ApiError(404, 'Envelope not found or does not belong to your organization'));
    }
    
    // Assess envelope compliance
    const result = await assessEnvelopeCompliance(id);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'envelope_compliance_assessed',
      metadata: {
        envelope_id: id,
        assessment_id: result.assessment_id,
        is_compliant: result.is_compliant
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: result.is_compliant 
        ? 'Envelope is compliant with regulations' 
        : 'Envelope has compliance issues that need to be addressed',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate organization compliance report
 * @route   POST /api/v1/compliance/report
 * @access  Private
 */
const generateOrgComplianceReport = async (req, res, next) => {
  try {
    const { 
      start_date, 
      end_date,
      include_events = true,
      include_assessments = true
    } = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Generate report
    const report = await generateComplianceReport(orgId, {
      start_date,
      end_date,
      include_events: include_events === true,
      include_assessments: include_assessments === true
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'compliance_report_generated',
      metadata: {
        report_id: report.id,
        start_date: report.report_period.start_date,
        end_date: report.report_period.end_date
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Compliance report generated successfully',
      data: {
        report_id: report.id,
        period: report.report_period,
        metrics: report.metrics
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get compliance assessment details
 * @route   GET /api/v1/compliance/assessment/:id
 * @access  Private
 */
const getComplianceAssessmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;
    
    // Get assessment
    const assessment = await getComplianceAssessment(id);
    
    // Check if assessment belongs to organization
    if (assessment.envelope.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to view this assessment'));
    }
    
    res.status(200).json({
      success: true,
      data: assessment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get compliance report details
 * @route   GET /api/v1/compliance/report/:id
 * @access  Private
 */
const getComplianceReportById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;
    
    // Get report
    const report = await getComplianceReport(id);
    
    // Check if report belongs to organization
    if (report.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to view this report'));
    }
    
    res.status(200).json({
      success: true,
      data: report.report_data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get organization compliance reports
 * @route   GET /api/v1/compliance/reports
 * @access  Private
 */
const getOrgComplianceReports = async (req, res, next) => {
  try {
    const { 
      limit = 20, 
      offset = 0 
    } = req.query;
    
    const orgId = req.user.org_id;
    
    // Get reports
    const reports = await getOrganizationComplianceReports(orgId, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Track compliance event
 * @route   POST /api/v1/compliance/event
 * @access  Private
 */
const trackComplianceEventHandler = async (req, res, next) => {
  try {
    const {
      envelope_id,
      document_id,
      signer_id,
      event_type,
      event_details,
      compliance_status,
      metadata
    } = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Validate required fields
    if (!event_type || !event_details || !compliance_status) {
      return next(new ApiError(400, 'Event type, details, and compliance status are required'));
    }
    
    // Track event
    const eventId = await trackComplianceEvent({
      org_id: orgId,
      user_id: userId,
      envelope_id,
      document_id,
      signer_id,
      event_type,
      event_details,
      compliance_status,
      metadata
    });
    
    res.status(200).json({
      success: true,
      message: 'Compliance event tracked successfully',
      data: {
        event_id: eventId
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download compliance report as PDF
 * @route   GET /api/v1/compliance/report/:id/download
 * @access  Private
 */
const downloadComplianceReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;
    
    // Get report
    const report = await getComplianceReport(id);
    
    // Check if report belongs to organization
    if (report.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to download this report'));
    }
    
    // Generate PDF report (this would be implemented with a PDF generation library)
    // For now, we'll just send the JSON data
    res.status(200).json({
      success: true,
      message: 'PDF generation not implemented yet',
      data: report.report_data
    });
    
    // Log event
    await logSystemEvent({
      user_id: req.user.id,
      action: 'compliance_report_downloaded',
      metadata: {
        report_id: id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  assessEnvelopeComplianceById,
  generateOrgComplianceReport,
  getComplianceAssessmentById,
  getComplianceReportById,
  getOrgComplianceReports,
  trackComplianceEventHandler,
  downloadComplianceReport
};
