/**
 * Accessibility Controller
 * 
 * This controller handles document accessibility features for the Sayina E-Signature platform,
 * ensuring documents are accessible to users with disabilities.
 */

const { ApiError } = require('../middleware/errorMiddleware');
const { 
  checkDocumentAccessibility,
  generateAccessibleVersion,
  getAccessibilityCheck,
  getAccessibleVersion,
  getDocumentAccessibilityChecks,
  getDocumentAccessibleVersions
} = require('../services/accessibilityService');
const { logSystemEvent } = require('../services/loggerService');
const fs = require('fs');
const { db } = require('../config/db');

/**
 * @desc    Check document accessibility
 * @route   POST /api/v1/accessibility/check
 * @access  Private
 */
const checkDocumentForAccessibility = async (req, res, next) => {
  try {
    const { document_id, options } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Validate required fields
    if (!document_id) {
      return next(new ApiError(400, 'Document ID is required'));
    }
    
    // Check if document exists and belongs to organization
    const document = await db('documents')
      .where('id', document_id)
      .where('org_id', orgId)
      .first();
    
    if (!document) {
      return next(new ApiError(404, 'Document not found or does not belong to your organization'));
    }
    
    // Check document accessibility
    const result = await checkDocumentAccessibility(document_id, options || {});
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'accessibility_check_created',
      metadata: {
        check_id: result.check_id,
        document_id,
        score: result.report.score
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Document accessibility check completed',
      data: {
        check_id: result.check_id,
        document_id,
        accessible: result.report.accessible,
        score: result.report.score,
        issues_count: result.report.issues.length,
        recommendations_count: result.report.recommendations.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get accessibility check details
 * @route   GET /api/v1/accessibility/check/:id
 * @access  Private
 */
const getAccessibilityCheckDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;
    
    // Get check
    const check = await getAccessibilityCheck(id);
    
    // Check if check belongs to organization
    if (check.document.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to view this accessibility check'));
    }
    
    res.status(200).json({
      success: true,
      data: check
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate accessible version of document
 * @route   POST /api/v1/accessibility/generate
 * @access  Private
 */
const generateAccessibleDocument = async (req, res, next) => {
  try {
    const { document_id, options } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Validate required fields
    if (!document_id) {
      return next(new ApiError(400, 'Document ID is required'));
    }
    
    // Check if document exists and belongs to organization
    const document = await db('documents')
      .where('id', document_id)
      .where('org_id', orgId)
      .first();
    
    if (!document) {
      return next(new ApiError(404, 'Document not found or does not belong to your organization'));
    }
    
    // Generate accessible version
    const result = await generateAccessibleVersion(document_id, options || {});
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'accessible_version_generated',
      metadata: {
        version_id: result.version_id,
        document_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Accessible document version generated successfully',
      data: {
        version_id: result.version_id,
        document_id,
        file_size: result.file_size
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download accessible version
 * @route   GET /api/v1/accessibility/version/:id/download
 * @access  Private
 */
const downloadAccessibleVersion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;
    
    // Get version
    const version = await getAccessibleVersion(id);
    
    // Check if version belongs to organization
    if (version.document.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to download this accessible version'));
    }
    
    // Check if version is completed
    if (version.status !== 'completed') {
      return next(new ApiError(400, 'Accessible version is not completed yet'));
    }
    
    // Check if file exists
    if (!version.file_path || !fs.existsSync(version.file_path)) {
      return next(new ApiError(404, 'Accessible version file not found'));
    }
    
    // Log event
    await logSystemEvent({
      user_id: req.user.id,
      action: 'accessible_version_downloaded',
      metadata: {
        version_id: id,
        document_id: version.document.id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    // Send file
    res.download(version.file_path, `accessible_${version.document.name}`);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get document accessibility checks
 * @route   GET /api/v1/accessibility/document/:documentId/checks
 * @access  Private
 */
const getDocumentChecks = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const orgId = req.user.org_id;
    
    // Check if document exists and belongs to organization
    const document = await db('documents')
      .where('id', documentId)
      .where('org_id', orgId)
      .first();
    
    if (!document) {
      return next(new ApiError(404, 'Document not found or does not belong to your organization'));
    }
    
    // Get checks
    const checks = await getDocumentAccessibilityChecks(documentId);
    
    res.status(200).json({
      success: true,
      count: checks.length,
      data: checks
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get document accessible versions
 * @route   GET /api/v1/accessibility/document/:documentId/versions
 * @access  Private
 */
const getDocumentVersions = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const orgId = req.user.org_id;
    
    // Check if document exists and belongs to organization
    const document = await db('documents')
      .where('id', documentId)
      .where('org_id', orgId)
      .first();
    
    if (!document) {
      return next(new ApiError(404, 'Document not found or does not belong to your organization'));
    }
    
    // Get versions
    const versions = await getDocumentAccessibleVersions(documentId);
    
    res.status(200).json({
      success: true,
      count: versions.length,
      data: versions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete accessibility check
 * @route   DELETE /api/v1/accessibility/check/:id
 * @access  Private
 */
const deleteAccessibilityCheck = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Get check
    const check = await getAccessibilityCheck(id);
    
    // Check if check belongs to organization
    if (check.document.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to delete this accessibility check'));
    }
    
    // Delete check from database
    await db('accessibility_checks')
      .where('id', id)
      .delete();
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'accessibility_check_deleted',
      metadata: {
        check_id: id,
        document_id: check.document.id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Accessibility check deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete accessible version
 * @route   DELETE /api/v1/accessibility/version/:id
 * @access  Private
 */
const deleteAccessibleVersion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Get version
    const version = await getAccessibleVersion(id);
    
    // Check if version belongs to organization
    if (version.document.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to delete this accessible version'));
    }
    
    // Delete file if it exists
    if (version.file_path && fs.existsSync(version.file_path)) {
      fs.unlinkSync(version.file_path);
    }
    
    // Delete version from database
    await db('accessible_versions')
      .where('id', id)
      .delete();
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'accessible_version_deleted',
      metadata: {
        version_id: id,
        document_id: version.document.id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Accessible version deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkDocumentForAccessibility,
  getAccessibilityCheckDetails,
  generateAccessibleDocument,
  downloadAccessibleVersion,
  getDocumentChecks,
  getDocumentVersions,
  deleteAccessibilityCheck,
  deleteAccessibleVersion
};
