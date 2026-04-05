/**
 * Bulk Operations Controller
 * 
 * This controller handles bulk operations for the Sayina E-Signature platform,
 * allowing efficient batch processing of documents, envelopes, and signers.
 */

const { ApiError } = require('../middleware/errorMiddleware');
const { 
  processBulkEnvelopeCreation,
  processBulkDocumentUpload,
  processBulkSignerAddition,
  getBulkOperationStatus,
  getOrganizationBulkOperations
} = require('../services/bulkOperationsService');
const { logSystemEvent } = require('../services/loggerService');

/**
 * @desc    Create bulk envelopes
 * @route   POST /api/v1/bulk/envelopes
 * @access  Private (org_admin)
 */
const createBulkEnvelopes = async (req, res, next) => {
  try {
    const { envelopes } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Validate request
    if (!Array.isArray(envelopes) || envelopes.length === 0) {
      return next(new ApiError(400, 'Invalid request. Envelopes array is required'));
    }
    
    // Check if number of envelopes exceeds limit
    if (envelopes.length > 100) {
      return next(new ApiError(400, 'Exceeded maximum limit of 100 envelopes per bulk operation'));
    }
    
    // Process bulk envelope creation
    const result = await processBulkEnvelopeCreation(orgId, userId, envelopes);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'bulk_envelopes_created',
      metadata: {
        operation_id: result.operation_id,
        total: result.total,
        successful: result.successful,
        failed: result.failed
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: `Processed ${result.total} envelopes: ${result.successful} successful, ${result.failed} failed`,
      data: {
        operation_id: result.operation_id,
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        results: result.results
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload bulk documents to envelope
 * @route   POST /api/v1/bulk/envelopes/:envelopeId/documents
 * @access  Private
 */
const uploadBulkDocuments = async (req, res, next) => {
  try {
    const { envelopeId } = req.params;
    const { documents } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Validate request
    if (!Array.isArray(documents) || documents.length === 0) {
      return next(new ApiError(400, 'Invalid request. Documents array is required'));
    }
    
    // Check if number of documents exceeds limit
    if (documents.length > 50) {
      return next(new ApiError(400, 'Exceeded maximum limit of 50 documents per bulk operation'));
    }
    
    // Process bulk document upload
    const result = await processBulkDocumentUpload(orgId, userId, envelopeId, documents);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'bulk_documents_uploaded',
      metadata: {
        operation_id: result.operation_id,
        envelope_id: envelopeId,
        total: result.total,
        successful: result.successful,
        failed: result.failed
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: `Processed ${result.total} documents: ${result.successful} successful, ${result.failed} failed`,
      data: {
        operation_id: result.operation_id,
        envelope_id: envelopeId,
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        results: result.results
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add bulk signers to envelope
 * @route   POST /api/v1/bulk/envelopes/:envelopeId/signers
 * @access  Private
 */
const addBulkSigners = async (req, res, next) => {
  try {
    const { envelopeId } = req.params;
    const { signers } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Validate request
    if (!Array.isArray(signers) || signers.length === 0) {
      return next(new ApiError(400, 'Invalid request. Signers array is required'));
    }
    
    // Check if number of signers exceeds limit
    if (signers.length > 100) {
      return next(new ApiError(400, 'Exceeded maximum limit of 100 signers per bulk operation'));
    }
    
    // Process bulk signer addition
    const result = await processBulkSignerAddition(orgId, userId, envelopeId, signers);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'bulk_signers_added',
      metadata: {
        operation_id: result.operation_id,
        envelope_id: envelopeId,
        total: result.total,
        successful: result.successful,
        failed: result.failed
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: `Processed ${result.total} signers: ${result.successful} successful, ${result.failed} failed`,
      data: {
        operation_id: result.operation_id,
        envelope_id: envelopeId,
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        results: result.results
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get bulk operation status
 * @route   GET /api/v1/bulk/operations/:operationId
 * @access  Private
 */
const getOperationStatus = async (req, res, next) => {
  try {
    const { operationId } = req.params;
    const orgId = req.user.org_id;
    
    // Get operation status
    const operation = await getBulkOperationStatus(operationId);
    
    // Check if operation belongs to organization
    if (operation.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to view this operation'));
    }
    
    res.status(200).json({
      success: true,
      data: operation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get organization bulk operations
 * @route   GET /api/v1/bulk/operations
 * @access  Private
 */
const getOrganizationOperations = async (req, res, next) => {
  try {
    const { 
      limit = 20, 
      offset = 0,
      operation_type,
      status
    } = req.query;
    
    const orgId = req.user.org_id;
    
    // Get operations
    const operations = await getOrganizationBulkOperations(orgId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      operation_type,
      status
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
 * @desc    Import CSV signers to envelope
 * @route   POST /api/v1/bulk/envelopes/:envelopeId/import-signers
 * @access  Private
 */
const importCsvSigners = async (req, res, next) => {
  try {
    const { envelopeId } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Check if CSV file was uploaded
    if (!req.file) {
      return next(new ApiError(400, 'No CSV file uploaded'));
    }
    
    // Parse CSV file
    const fs = require('fs');
    const csv = require('csv-parser');
    const path = require('path');
    
    const results = [];
    const filePath = req.file.path;
    
    // Read CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });
    
    // Validate CSV data
    if (results.length === 0) {
      return next(new ApiError(400, 'CSV file is empty or invalid'));
    }
    
    // Check required columns
    const requiredColumns = ['name', 'email'];
    const firstRow = results[0];
    
    for (const column of requiredColumns) {
      if (!firstRow.hasOwnProperty(column)) {
        return next(new ApiError(400, `CSV file is missing required column: ${column}`));
      }
    }
    
    // Format signers data
    const signers = results.map((row, index) => ({
      name: row.name,
      email: row.email,
      phone: row.phone || null,
      role: row.role || 'signer',
      order: row.order ? parseInt(row.order) : index + 1
    }));
    
    // Process bulk signer addition
    const result = await processBulkSignerAddition(orgId, userId, envelopeId, signers);
    
    // Clean up temporary file
    fs.unlinkSync(filePath);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'csv_signers_imported',
      metadata: {
        operation_id: result.operation_id,
        envelope_id: envelopeId,
        total: result.total,
        successful: result.successful,
        failed: result.failed
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: `Imported ${result.total} signers from CSV: ${result.successful} successful, ${result.failed} failed`,
      data: {
        operation_id: result.operation_id,
        envelope_id: envelopeId,
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        results: result.results
      }
    });
  } catch (error) {
    // Clean up temporary file if it exists
    if (req.file && req.file.path) {
      const fs = require('fs');
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }
    
    next(error);
  }
};

/**
 * @desc    Download bulk operation results
 * @route   GET /api/v1/bulk/operations/:operationId/download
 * @access  Private
 */
const downloadOperationResults = async (req, res, next) => {
  try {
    const { operationId } = req.params;
    const { format = 'csv' } = req.query;
    const orgId = req.user.org_id;
    
    // Get operation status
    const operation = await getBulkOperationStatus(operationId);
    
    // Check if operation belongs to organization
    if (operation.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to download this operation'));
    }
    
    // Check if operation is completed
    if (operation.status !== 'completed') {
      return next(new ApiError(400, 'Operation is not completed yet'));
    }
    
    // Check if results are available
    if (!operation.results) {
      return next(new ApiError(400, 'No results available for this operation'));
    }
    
    // Generate file based on format
    if (format === 'csv') {
      const { Parser } = require('json2csv');
      const fs = require('fs');
      const path = require('path');
      
      // Prepare data for CSV
      let fields = [];
      let data = [];
      
      if (operation.results.successful && operation.results.successful.length > 0) {
        fields = Object.keys(operation.results.successful[0]);
        data = operation.results.successful;
      }
      
      if (operation.results.failed && operation.results.failed.length > 0) {
        // If we don't have successful results, use failed results for fields
        if (fields.length === 0) {
          fields = Object.keys(operation.results.failed[0]);
        }
        
        // Add status field to distinguish between successful and failed
        data = [
          ...data.map(item => ({ ...item, status: 'success' })),
          ...operation.results.failed.map(item => ({ ...item, status: 'failed' }))
        ];
      }
      
      // Add status field if not already present
      if (fields.indexOf('status') === -1) {
        fields.push('status');
      }
      
      // Generate CSV
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(data);
      
      // Create temp file
      const tempFilePath = path.join(__dirname, '..', 'temp', `operation_${operationId}.csv`);
      
      // Ensure temp directory exists
      if (!fs.existsSync(path.join(__dirname, '..', 'temp'))) {
        fs.mkdirSync(path.join(__dirname, '..', 'temp'), { recursive: true });
      }
      
      fs.writeFileSync(tempFilePath, csv);
      
      // Send file
      res.download(tempFilePath, `operation_${operationId}.csv`, (err) => {
        if (err) {
          next(new ApiError(500, 'Error sending file'));
        }
        
        // Delete temp file
        fs.unlinkSync(tempFilePath);
      });
    } else if (format === 'json') {
      // Send JSON directly
      res.setHeader('Content-Disposition', `attachment; filename="operation_${operationId}.json"`);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(operation.results, null, 2));
    } else {
      return next(new ApiError(400, 'Invalid format. Supported formats: csv, json'));
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBulkEnvelopes,
  uploadBulkDocuments,
  addBulkSigners,
  getOperationStatus,
  getOrganizationOperations,
  importCsvSigners,
  downloadOperationResults
};
