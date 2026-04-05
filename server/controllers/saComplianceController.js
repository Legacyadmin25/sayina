/**
 * South African Compliance Controller
 * 
 * This controller handles compliance features for the Sayina E-Signature platform,
 * ensuring adherence to South African regulations like the ECT Act and POPIA.
 */

const { ApiError } = require('../middleware/errorMiddleware');
const {
  validateEctActCompliance,
  validatePopiaCompliance,
  generateComplianceReport,
  getComplianceHistory,
  getComplianceReports,
  getComplianceReportById,
  createPopiaConsentRecord,
  getUserConsentRecords
} = require('../services/saComplianceService');
const { logSystemEvent } = require('../services/loggerService');

/**
 * @desc    Validate document for ECT Act compliance
 * @route   POST /api/v1/compliance/ect-act/documents/:documentId
 * @access  Private
 */
const validateEctActComplianceHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;
    
    // Validate compliance
    const complianceResult = await validateEctActCompliance(documentId);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'ect_act_compliance_check',
      metadata: {
        document_id: documentId,
        compliance_id: complianceResult.compliance_id,
        status: complianceResult.status
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      data: complianceResult
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Validate POPIA compliance
 * @route   POST /api/v1/compliance/popia/organization
 * @access  Private
 */
const validatePopiaComplianceHandler = async (req, res, next) => {
  try {
    const orgId = req.user.org_id;
    const userId = req.user.id;
    
    // Validate compliance
    const complianceResult = await validatePopiaCompliance(orgId);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'popia_compliance_check',
      metadata: {
        org_id: orgId,
        compliance_id: complianceResult.compliance_id,
        status: complianceResult.status
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      data: complianceResult
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate compliance report
 * @route   POST /api/v1/compliance/reports
 * @access  Private
 */
const generateComplianceReportHandler = async (req, res, next) => {
  try {
    const {
      start_date,
      end_date,
      include_ect_act,
      include_popia
    } = req.body;
    
    const orgId = req.user.org_id;
    const userId = req.user.id;
    
    // Generate report
    const reportFilePath = await generateComplianceReport(orgId, {
      start_date,
      end_date,
      include_ect_act,
      include_popia
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'compliance_report_generated',
      metadata: {
        org_id: orgId,
        report_path: reportFilePath
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Compliance report generated successfully',
      data: {
        report_path: reportFilePath
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get compliance history
 * @route   GET /api/v1/compliance/history
 * @access  Private
 */
const getComplianceHistoryHandler = async (req, res, next) => {
  try {
    const {
      check_type,
      status,
      limit = 20,
      offset = 0
    } = req.query;
    
    const orgId = req.user.org_id;
    
    // Get compliance history
    const history = await getComplianceHistory(orgId, {
      check_type,
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get compliance reports
 * @route   GET /api/v1/compliance/reports
 * @access  Private
 */
const getComplianceReportsHandler = async (req, res, next) => {
  try {
    const {
      limit = 20,
      offset = 0
    } = req.query;
    
    const orgId = req.user.org_id;
    
    // Get compliance reports
    const reports = await getComplianceReports(orgId, {
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
 * @desc    Get compliance report by ID
 * @route   GET /api/v1/compliance/reports/:reportId
 * @access  Private
 */
const getComplianceReportByIdHandler = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const orgId = req.user.org_id;
    
    // Get report
    const report = await getComplianceReportById(reportId);
    
    // Check if report belongs to organization
    if (report.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to view this report'));
    }
    
    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create POPIA consent record
 * @route   POST /api/v1/compliance/popia/consent
 * @access  Private
 */
const createPopiaConsentRecordHandler = async (req, res, next) => {
  try {
    const {
      purpose,
      data_categories,
      third_parties,
      retention_period,
      consent_text
    } = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Validate required fields
    if (!consent_text) {
      return next(new ApiError(400, 'Consent text is required'));
    }
    
    // Create consent record
    const consentId = await createPopiaConsentRecord(userId, orgId, {
      purpose,
      data_categories,
      third_parties,
      retention_period,
      consent_text,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'popia_consent_recorded',
      metadata: {
        consent_id: consentId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'POPIA consent record created successfully',
      data: {
        consent_id: consentId
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user consent records
 * @route   GET /api/v1/compliance/popia/consent
 * @access  Private
 */
const getUserConsentRecordsHandler = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get consent records
    const records = await getUserConsentRecords(userId);
    
    res.status(200).json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download compliance report
 * @route   GET /api/v1/compliance/reports/:reportId/download
 * @access  Private
 */
const downloadComplianceReportHandler = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const orgId = req.user.org_id;
    
    // Get report
    const report = await getComplianceReportById(reportId);
    
    // Check if report belongs to organization
    if (report.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to download this report'));
    }
    
    // For now, we're just sending the JSON file
    // In a real implementation, this would be a properly formatted PDF
    
    // Log event
    await logSystemEvent({
      user_id: req.user.id,
      action: 'compliance_report_downloaded',
      metadata: {
        report_id: reportId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    // Send file
    res.download(`${__dirname}/../uploads/compliance_reports/${reportId}.json`, `compliance_report_${reportId}.json`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateEctActComplianceHandler,
  validatePopiaComplianceHandler,
  generateComplianceReportHandler,
  getComplianceHistoryHandler,
  getComplianceReportsHandler,
  getComplianceReportByIdHandler,
  createPopiaConsentRecordHandler,
  getUserConsentRecordsHandler,
  downloadComplianceReportHandler
};
