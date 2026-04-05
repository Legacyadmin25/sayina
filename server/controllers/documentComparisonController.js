/**
 * Document Comparison Controller
 * 
 * This controller handles document comparison functionality for the Sayina E-Signature platform,
 * allowing users to compare different versions of documents and identify changes.
 */

const { ApiError } = require('../middleware/errorMiddleware');
const { 
  compareDocuments,
  getDocumentComparison,
  getOrganizationComparisons
} = require('../services/documentComparisonService');
const { logSystemEvent } = require('../services/loggerService');
const fs = require('fs');
const path = require('path');

/**
 * @desc    Compare two documents
 * @route   POST /api/v1/documents/compare
 * @access  Private
 */
const compareDocumentVersions = async (req, res, next) => {
  try {
    const { 
      original_document_id, 
      revised_document_id,
      options 
    } = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Validate required fields
    if (!original_document_id || !revised_document_id) {
      return next(new ApiError(400, 'Original and revised document IDs are required'));
    }
    
    // Compare documents
    const result = await compareDocuments(original_document_id, revised_document_id, options || {});
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'document_comparison_created',
      metadata: {
        comparison_id: result.comparison_id,
        original_document_id,
        revised_document_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Document comparison created successfully',
      data: {
        comparison_id: result.comparison_id,
        original_document: result.original_document,
        revised_document: result.revised_document,
        page_count: result.page_count,
        text_changes: {
          additions: result.text_changes.additions.length,
          deletions: result.text_changes.deletions.length,
          modifications: result.text_changes.modifications.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get comparison details
 * @route   GET /api/v1/documents/compare/:id
 * @access  Private
 */
const getComparisonDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;
    
    // Get comparison
    const comparison = await getDocumentComparison(id);
    
    // Check if comparison belongs to organization
    if (comparison.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to view this comparison'));
    }
    
    res.status(200).json({
      success: true,
      data: {
        id: comparison.id,
        status: comparison.status,
        original_document: comparison.original_document,
        revised_document: comparison.revised_document,
        text_changes: comparison.text_changes,
        page_count: comparison.page_count,
        created_at: comparison.created_at,
        completed_at: comparison.completed_at
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download comparison result
 * @route   GET /api/v1/documents/compare/:id/download
 * @access  Private
 */
const downloadComparisonResult = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;
    
    // Get comparison
    const comparison = await getDocumentComparison(id);
    
    // Check if comparison belongs to organization
    if (comparison.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to download this comparison'));
    }
    
    // Check if comparison is completed
    if (comparison.status !== 'completed') {
      return next(new ApiError(400, 'Comparison is not completed yet'));
    }
    
    // Check if result file exists
    if (!comparison.result_file_path || !fs.existsSync(comparison.result_file_path)) {
      return next(new ApiError(404, 'Comparison result file not found'));
    }
    
    // Get file name
    const fileName = path.basename(comparison.result_file_path);
    
    // Log event
    await logSystemEvent({
      user_id: req.user.id,
      action: 'document_comparison_downloaded',
      metadata: {
        comparison_id: id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    // Send file
    res.download(comparison.result_file_path, `comparison_result_${id}.pdf`);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get organization comparisons
 * @route   GET /api/v1/documents/compare
 * @access  Private
 */
const getOrganizationComparisonsList = async (req, res, next) => {
  try {
    const { 
      limit = 20, 
      offset = 0 
    } = req.query;
    
    const orgId = req.user.org_id;
    
    // Get comparisons
    const comparisons = await getOrganizationComparisons(orgId, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.status(200).json({
      success: true,
      count: comparisons.length,
      data: comparisons
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete comparison
 * @route   DELETE /api/v1/documents/compare/:id
 * @access  Private
 */
const deleteComparison = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Get comparison
    const comparison = await getDocumentComparison(id);
    
    // Check if comparison belongs to organization
    if (comparison.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to delete this comparison'));
    }
    
    // Delete result file if it exists
    if (comparison.result_file_path && fs.existsSync(comparison.result_file_path)) {
      fs.unlinkSync(comparison.result_file_path);
    }
    
    // Delete comparison from database
    await db('document_comparisons')
      .where('id', id)
      .delete();
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'document_comparison_deleted',
      metadata: {
        comparison_id: id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Comparison deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  compareDocumentVersions,
  getComparisonDetails,
  downloadComparisonResult,
  getOrganizationComparisonsList,
  deleteComparison
};
