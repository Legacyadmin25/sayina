/**
 * Version Control Controller
 * 
 * This controller handles document versioning for the Sayina E-Signature platform,
 * allowing tracking of document changes and revisions over time.
 */

const { ApiError } = require('../middleware/errorMiddleware');
const { 
  createDocumentVersion,
  getDocumentVersions,
  getVersionDetails,
  restoreDocumentVersion,
  deleteDocumentVersion,
  getVersionRestoreHistory,
  getDocumentVersionCount
} = require('../services/versionControlService');
const { logSystemEvent } = require('../services/loggerService');
const multer = require('multer');
const { db } = require('../config/db');

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
}).single('file');

/**
 * @desc    Create a new document version
 * @route   POST /api/v1/versions/document/:documentId
 * @access  Private
 */
const createVersion = async (req, res, next) => {
  // Use multer to handle file upload
  upload(req, res, async (err) => {
    try {
      if (err) {
        return next(new ApiError(400, `File upload error: ${err.message}`));
      }
      
      const { documentId } = req.params;
      const { version_number, changes_description } = req.body;
      const userId = req.user.id;
      const orgId = req.user.org_id;
      
      // Check if file was uploaded
      if (!req.file) {
        return next(new ApiError(400, 'No file uploaded'));
      }
      
      // Validate required fields
      if (!version_number) {
        return next(new ApiError(400, 'Version number is required'));
      }
      
      // Check if document exists and belongs to organization
      const document = await db('documents')
        .where('id', documentId)
        .where('org_id', orgId)
        .first();
      
      if (!document) {
        return next(new ApiError(404, 'Document not found or does not belong to your organization'));
      }
      
      // Create version
      const versionId = await createDocumentVersion(documentId, {
        version_number: parseInt(version_number),
        changes_description,
        created_by: userId
      }, req.file);
      
      // Log event
      await logSystemEvent({
        user_id: userId,
        action: 'document_version_created',
        metadata: {
          document_id: documentId,
          version_id: versionId,
          version_number
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
      
      res.status(201).json({
        success: true,
        message: 'Document version created successfully',
        data: {
          version_id: versionId,
          document_id: documentId,
          version_number
        }
      });
    } catch (error) {
      next(error);
    }
  });
};

/**
 * @desc    Get document versions
 * @route   GET /api/v1/versions/document/:documentId
 * @access  Private
 */
const getVersions = async (req, res, next) => {
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
    const versions = await getDocumentVersions(documentId);
    
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
 * @desc    Get version details
 * @route   GET /api/v1/versions/:id
 * @access  Private
 */
const getVersion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;
    
    // Get version
    const version = await getVersionDetails(id);
    
    // Check if version belongs to organization
    if (version.document.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to view this version'));
    }
    
    res.status(200).json({
      success: true,
      data: version
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download version file
 * @route   GET /api/v1/versions/:id/download
 * @access  Private
 */
const downloadVersion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;
    
    // Get version
    const version = await getVersionDetails(id);
    
    // Check if version belongs to organization
    if (version.document.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to download this version'));
    }
    
    // Check if file exists
    if (!version.file_path) {
      return next(new ApiError(404, 'Version file not found'));
    }
    
    // Log event
    await logSystemEvent({
      user_id: req.user.id,
      action: 'document_version_downloaded',
      metadata: {
        version_id: id,
        document_id: version.document.id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    // Send file
    res.download(version.file_path, version.file_name);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Restore document version
 * @route   POST /api/v1/versions/:id/restore
 * @access  Private
 */
const restoreVersion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Get version
    const version = await getVersionDetails(id);
    
    // Check if version belongs to organization
    if (version.document.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to restore this version'));
    }
    
    // Restore version
    const result = await restoreDocumentVersion(id, userId);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'document_version_restored',
      metadata: {
        version_id: id,
        document_id: version.document.id,
        backup_version_id: result.backup_version_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Document version restored successfully',
      data: {
        document_id: result.document_id,
        version_id: result.version_id,
        backup_version_id: result.backup_version_id
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete document version
 * @route   DELETE /api/v1/versions/:id
 * @access  Private
 */
const deleteVersion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Get version
    const version = await getVersionDetails(id);
    
    // Check if version belongs to organization
    if (version.document.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to delete this version'));
    }
    
    // Delete version
    await deleteDocumentVersion(id);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'document_version_deleted',
      metadata: {
        version_id: id,
        document_id: version.document.id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Document version deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get version restore history
 * @route   GET /api/v1/versions/document/:documentId/history
 * @access  Private
 */
const getRestoreHistory = async (req, res, next) => {
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
    
    // Get restore history
    const history = await getVersionRestoreHistory(documentId);
    
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
 * @desc    Compare versions
 * @route   POST /api/v1/versions/compare
 * @access  Private
 */
const compareVersions = async (req, res, next) => {
  try {
    const { version1_id, version2_id } = req.body;
    const orgId = req.user.org_id;
    
    // Validate required fields
    if (!version1_id || !version2_id) {
      return next(new ApiError(400, 'Both version IDs are required'));
    }
    
    // Get versions
    const version1 = await getVersionDetails(version1_id);
    const version2 = await getVersionDetails(version2_id);
    
    // Check if versions belong to organization
    if (version1.document.org_id !== orgId || version2.document.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to compare these versions'));
    }
    
    // Check if versions belong to the same document
    if (version1.document.id !== version2.document.id) {
      return next(new ApiError(400, 'Versions must belong to the same document'));
    }
    
    // Redirect to document comparison
    res.status(200).json({
      success: true,
      message: 'Use document comparison service to compare these versions',
      data: {
        document1_id: version1_id,
        document2_id: version2_id
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createVersion,
  getVersions,
  getVersion,
  downloadVersion,
  restoreVersion,
  deleteVersion,
  getRestoreHistory,
  compareVersions
};
