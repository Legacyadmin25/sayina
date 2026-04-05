/**
 * Batch Processing Controller
 * 
 * This controller handles batch processing operations for the Sayina E-Signature platform,
 * allowing for efficient handling of multiple documents, envelopes, and signers.
 */

const { ApiError } = require('../middleware/errorMiddleware');
const {
  createBatchOperation,
  getBatchOperation,
  getOrganizationBatchOperations,
  processCsvFile,
  processBatchOperation
} = require('../services/batchProcessingService');
const { logSystemEvent } = require('../services/loggerService');
const multer = require('multer');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
}).fields([
  { name: 'csv', maxCount: 1 },
  { name: 'documents', maxCount: 20 }
]);

/**
 * @desc    Create batch envelopes
 * @route   POST /api/v1/batch/envelopes
 * @access  Private
 */
const createBatchEnvelopes = async (req, res, next) => {
  // Use multer to handle file upload
  upload(req, res, async (err) => {
    try {
      if (err) {
        return next(new ApiError(400, `File upload error: ${err.message}`));
      }
      
      const userId = req.user.id;
      const orgId = req.user.org_id;
      
      // Check if CSV file was uploaded
      if (!req.files || !req.files.csv) {
        return next(new ApiError(400, 'CSV file is required'));
      }
      
      // Process CSV file
      const csvData = await processCsvFile(req.files.csv[0].buffer);
      
      // Validate CSV data
      if (!csvData || csvData.length === 0) {
        return next(new ApiError(400, 'CSV file is empty or invalid'));
      }
      
      // Create batch operation
      const batchId = await createBatchOperation(orgId, userId, 'create_envelopes', {
        envelopes: csvData
      });
      
      // Process batch operation asynchronously
      processBatchOperation(batchId).catch(error => {
        console.error('Error processing batch operation:', error);
      });
      
      // Log event
      await logSystemEvent({
        user_id: userId,
        action: 'batch_envelopes_created',
        metadata: {
          batch_id: batchId,
          envelope_count: csvData.length
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
      
      res.status(202).json({
        success: true,
        message: 'Batch envelope creation started',
        data: {
          batch_id: batchId,
          status: 'pending',
          envelope_count: csvData.length
        }
      });
    } catch (error) {
      next(error);
    }
  });
};

/**
 * @desc    Add batch documents to envelope
 * @route   POST /api/v1/batch/envelopes/:envelopeId/documents
 * @access  Private
 */
const addBatchDocuments = async (req, res, next) => {
  // Use multer to handle file upload
  upload(req, res, async (err) => {
    try {
      if (err) {
        return next(new ApiError(400, `File upload error: ${err.message}`));
      }
      
      const { envelopeId } = req.params;
      const userId = req.user.id;
      const orgId = req.user.org_id;
      
      // Check if documents were uploaded
      if (!req.files || !req.files.documents || req.files.documents.length === 0) {
        return next(new ApiError(400, 'At least one document is required'));
      }
      
      // Create batch operation
      const batchId = await createBatchOperation(orgId, userId, 'add_documents', {
        envelope_id: envelopeId,
        files: req.files.documents
      });
      
      // Process batch operation asynchronously
      processBatchOperation(batchId).catch(error => {
        console.error('Error processing batch operation:', error);
      });
      
      // Log event
      await logSystemEvent({
        user_id: userId,
        action: 'batch_documents_added',
        metadata: {
          batch_id: batchId,
          envelope_id: envelopeId,
          document_count: req.files.documents.length
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
      
      res.status(202).json({
        success: true,
        message: 'Batch document addition started',
        data: {
          batch_id: batchId,
          status: 'pending',
          document_count: req.files.documents.length
        }
      });
    } catch (error) {
      next(error);
    }
  });
};

/**
 * @desc    Add batch signers to envelope
 * @route   POST /api/v1/batch/envelopes/:envelopeId/signers
 * @access  Private
 */
const addBatchSigners = async (req, res, next) => {
  // Use multer to handle file upload
  upload(req, res, async (err) => {
    try {
      if (err) {
        return next(new ApiError(400, `File upload error: ${err.message}`));
      }
      
      const { envelopeId } = req.params;
      const userId = req.user.id;
      const orgId = req.user.org_id;
      
      // Check if CSV file was uploaded
      if (!req.files || !req.files.csv) {
        return next(new ApiError(400, 'CSV file is required'));
      }
      
      // Process CSV file
      const csvData = await processCsvFile(req.files.csv[0].buffer);
      
      // Validate CSV data
      if (!csvData || csvData.length === 0) {
        return next(new ApiError(400, 'CSV file is empty or invalid'));
      }
      
      // Validate required fields
      for (const signer of csvData) {
        if (!signer.email || !signer.first_name || !signer.last_name) {
          return next(new ApiError(400, 'Each signer must have email, first_name, and last_name'));
        }
      }
      
      // Create batch operation
      const batchId = await createBatchOperation(orgId, userId, 'add_signers', {
        envelope_id: envelopeId,
        signers: csvData
      });
      
      // Process batch operation asynchronously
      processBatchOperation(batchId).catch(error => {
        console.error('Error processing batch operation:', error);
      });
      
      // Log event
      await logSystemEvent({
        user_id: userId,
        action: 'batch_signers_added',
        metadata: {
          batch_id: batchId,
          envelope_id: envelopeId,
          signer_count: csvData.length
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
      
      res.status(202).json({
        success: true,
        message: 'Batch signer addition started',
        data: {
          batch_id: batchId,
          status: 'pending',
          signer_count: csvData.length
        }
      });
    } catch (error) {
      next(error);
    }
  });
};

/**
 * @desc    Get batch operation status
 * @route   GET /api/v1/batch/:batchId
 * @access  Private
 */
const getBatchStatus = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Get batch operation
    const operation = await getBatchOperation(batchId);
    
    // Check if operation belongs to organization
    if (operation.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to view this batch operation'));
    }
    
    res.status(200).json({
      success: true,
      data: {
        id: operation.id,
        operation_type: operation.operation_type,
        status: operation.status,
        results: operation.results,
        created_at: operation.created_at,
        updated_at: operation.updated_at,
        completed_at: operation.completed_at
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get organization batch operations
 * @route   GET /api/v1/batch
 * @access  Private
 */
const getBatchOperations = async (req, res, next) => {
  try {
    const { status, operation_type, limit = 20, offset = 0 } = req.query;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Get batch operations
    const operations = await getOrganizationBatchOperations(orgId, {
      status,
      operationType: operation_type,
      userId,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.status(200).json({
      success: true,
      count: operations.length,
      data: operations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download batch operation results as CSV
 * @route   GET /api/v1/batch/:batchId/download
 * @access  Private
 */
const downloadBatchResults = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Get batch operation
    const operation = await getBatchOperation(batchId);
    
    // Check if operation belongs to organization
    if (operation.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to download these results'));
    }
    
    // Check if operation is completed
    if (operation.status !== 'completed') {
      return next(new ApiError(400, 'Batch operation is not yet completed'));
    }
    
    // Check if operation has results
    if (!operation.results) {
      return next(new ApiError(400, 'No results available for this batch operation'));
    }
    
    // Generate CSV based on operation type
    let csv = '';
    
    switch (operation.operation_type) {
      case 'create_envelopes':
        csv = 'envelope_id,name,success,error\n';
        operation.results.envelopes.forEach(envelope => {
          csv += `${envelope.envelope_id || ''},${envelope.name},${envelope.success},${envelope.error || ''}\n`;
        });
        break;
      
      case 'add_documents':
        csv = 'document_id,name,success,error\n';
        operation.results.documents.forEach(document => {
          csv += `${document.document_id || ''},${document.name},${document.success},${document.error || ''}\n`;
        });
        break;
      
      case 'add_signers':
        csv = 'signer_id,email,name,success,error\n';
        operation.results.signers.forEach(signer => {
          csv += `${signer.signer_id || ''},${signer.email},${signer.name},${signer.success},${signer.error || ''}\n`;
        });
        break;
      
      default:
        return next(new ApiError(400, 'Unsupported operation type for CSV download'));
    }
    
    // Set headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=batch_${batchId}_results.csv`);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'batch_results_downloaded',
      metadata: {
        batch_id: batchId,
        operation_type: operation.operation_type
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    // Send CSV
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download batch operation results as JSON
 * @route   GET /api/v1/batch/:batchId/download/json
 * @access  Private
 */
const downloadBatchResultsJson = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Get batch operation
    const operation = await getBatchOperation(batchId);
    
    // Check if operation belongs to organization
    if (operation.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to download these results'));
    }
    
    // Check if operation is completed
    if (operation.status !== 'completed') {
      return next(new ApiError(400, 'Batch operation is not yet completed'));
    }
    
    // Check if operation has results
    if (!operation.results) {
      return next(new ApiError(400, 'No results available for this batch operation'));
    }
    
    // Set headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=batch_${batchId}_results.json`);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'batch_results_downloaded_json',
      metadata: {
        batch_id: batchId,
        operation_type: operation.operation_type
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    // Send JSON
    res.send(operation.results);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get batch operation template CSV
 * @route   GET /api/v1/batch/template/:type
 * @access  Private
 */
const getBatchTemplate = async (req, res, next) => {
  try {
    const { type } = req.params;
    
    let csv = '';
    
    switch (type) {
      case 'envelopes':
        csv = 'name,description\nSample Envelope 1,Description for envelope 1\nSample Envelope 2,Description for envelope 2';
        break;
      
      case 'signers':
        csv = 'email,first_name,last_name,phone,signing_order,role\njohn@example.com,John,Doe,+27123456789,1,signer\njane@example.com,Jane,Smith,+27987654321,2,reviewer';
        break;
      
      default:
        return next(new ApiError(400, 'Invalid template type'));
    }
    
    // Set headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_template.csv`);
    
    // Send CSV
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBatchEnvelopes,
  addBatchDocuments,
  addBatchSigners,
  getBatchStatus,
  getBatchOperations,
  downloadBatchResults,
  downloadBatchResultsJson,
  getBatchTemplate
};
