/**
 * Regulatory Compliance Controller
 * 
 * This controller handles regulatory compliance automation features for the Sayina E-Signature platform,
 * including compliance checks, reporting, and jurisdiction-specific requirements.
 */

const { ApiError } = require('../middleware/errorMiddleware');
const {
  getSupportedRegulations,
  checkDocumentCompliance,
  generateComplianceReport,
  getJurisdictionRequirements,
  configureComplianceSettings,
  getComplianceSettings,
  getComplianceCheck,
  getDocumentComplianceChecks
} = require('../services/regulatoryComplianceService');
const { logSystemEvent } = require('../services/loggerService');

/**
 * @desc    Get supported regulations
 * @route   GET /api/v1/regulatory/regulations
 * @access  Private
 */
const getSupportedRegulationsHandler = async (req, res, next) => {
  try {
    // Get regulations
    const regulations = await getSupportedRegulations();
    
    res.status(200).json({
      success: true,
      count: regulations.length,
      data: regulations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Check document compliance
 * @route   POST /api/v1/regulatory/documents/:documentId/check
 * @access  Private
 */
const checkDocumentComplianceHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { regulation_id } = req.body;
    
    const userId = req.user.id;
    
    // Validate required fields
    if (!regulation_id) {
      return next(new ApiError(400, 'Regulation ID is required'));
    }
    
    // Check compliance
    const complianceResult = await checkDocumentCompliance(documentId, regulation_id);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'document_compliance_check',
      metadata: {
        document_id: documentId,
        regulation_id,
        check_id: complianceResult.check_id,
        status: complianceResult.status
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Document compliance check completed',
      data: complianceResult
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate compliance report
 * @route   POST /api/v1/regulatory/reports
 * @access  Private
 */
const generateComplianceReportHandler = async (req, res, next) => {
  try {
    const {
      start_date,
      end_date,
      regulation_ids,
      include_recommendations
    } = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Generate report
    const reportResult = await generateComplianceReport(orgId, {
      start_date,
      end_date,
      regulation_ids,
      include_recommendations
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'compliance_report_generated',
      metadata: {
        report_id: reportResult.report_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'Compliance report generated successfully',
      data: reportResult
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get jurisdiction requirements
 * @route   GET /api/v1/regulatory/jurisdictions/:jurisdictionCode
 * @access  Private
 */
const getJurisdictionRequirementsHandler = async (req, res, next) => {
  try {
    const { jurisdictionCode } = req.params;
    
    // Get requirements
    const requirements = await getJurisdictionRequirements(jurisdictionCode);
    
    res.status(200).json({
      success: true,
      data: requirements
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Configure compliance settings
 * @route   PUT /api/v1/regulatory/settings
 * @access  Private
 */
const configureComplianceSettingsHandler = async (req, res, next) => {
  try {
    const {
      default_jurisdiction,
      enabled_regulations,
      auto_check_compliance,
      retention_policy
    } = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Configure settings
    const settings = await configureComplianceSettings(orgId, {
      default_jurisdiction,
      enabled_regulations,
      auto_check_compliance,
      retention_policy
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'compliance_settings_updated',
      metadata: {
        settings
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Compliance settings updated successfully',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get compliance settings
 * @route   GET /api/v1/regulatory/settings
 * @access  Private
 */
const getComplianceSettingsHandler = async (req, res, next) => {
  try {
    const orgId = req.user.org_id;
    
    // Get settings
    const settings = await getComplianceSettings(orgId);
    
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get compliance check
 * @route   GET /api/v1/regulatory/checks/:checkId
 * @access  Private
 */
const getComplianceCheckHandler = async (req, res, next) => {
  try {
    const { checkId } = req.params;
    
    // Get check
    const check = await getComplianceCheck(checkId);
    
    res.status(200).json({
      success: true,
      data: check
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get document compliance checks
 * @route   GET /api/v1/regulatory/documents/:documentId/checks
 * @access  Private
 */
const getDocumentComplianceChecksHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    
    // Get checks
    const checks = await getDocumentComplianceChecks(documentId);
    
    res.status(200).json({
      success: true,
      count: checks.length,
      data: checks
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSupportedRegulationsHandler,
  checkDocumentComplianceHandler,
  generateComplianceReportHandler,
  getJurisdictionRequirementsHandler,
  configureComplianceSettingsHandler,
  getComplianceSettingsHandler,
  getComplianceCheckHandler,
  getDocumentComplianceChecksHandler
};
