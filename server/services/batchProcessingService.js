/**
 * Batch Processing Service
 * 
 * This service provides functionality for batch processing of documents and envelopes
 * in the Sayina E-Signature platform, allowing for efficient handling of multiple documents.
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Readable } = require('stream');
const db = require('../config/db');
const { logSystemEvent } = require('./loggerService');

/**
 * Create a batch operation
 * @param {string} orgId - Organization ID
 * @param {string} userId - User ID
 * @param {string} operationType - Operation type
 * @param {Object} metadata - Operation metadata
 * @returns {Promise<string>} - Batch operation ID
 */
const createBatchOperation = async (orgId, userId, operationType, metadata = {}) => {
  try {
    const batchId = uuidv4();
    
    await db('batch_operations').insert({
      id: batchId,
      org_id: orgId,
      user_id: userId,
      operation_type: operationType,
      status: 'pending',
      metadata: JSON.stringify(metadata),
      created_at: db.fn.now()
    });
    
    return batchId;
  } catch (error) {
    console.error('Error creating batch operation:', error);
    throw error;
  }
};

/**
 * Update batch operation status
 * @param {string} batchId - Batch operation ID
 * @param {string} status - New status
 * @param {Object} results - Operation results
 * @returns {Promise<boolean>} - Success status
 */
const updateBatchOperationStatus = async (batchId, status, results = null) => {
  try {
    const updateData = {
      status,
      updated_at: db.fn.now()
    };
    
    if (results) {
      updateData.results = JSON.stringify(results);
    }
    
    await db('batch_operations')
      .where('id', batchId)
      .update(updateData);
    
    return true;
  } catch (error) {
    console.error('Error updating batch operation status:', error);
    throw error;
  }
};

/**
 * Get batch operation
 * @param {string} batchId - Batch operation ID
 * @returns {Promise<Object>} - Batch operation details
 */
const getBatchOperation = async (batchId) => {
  try {
    const operation = await db('batch_operations')
      .where('id', batchId)
      .first();
    
    if (!operation) {
      throw new Error('Batch operation not found');
    }
    
    return {
      id: operation.id,
      org_id: operation.org_id,
      user_id: operation.user_id,
      operation_type: operation.operation_type,
      status: operation.status,
      metadata: JSON.parse(operation.metadata),
      results: operation.results ? JSON.parse(operation.results) : null,
      created_at: operation.created_at,
      updated_at: operation.updated_at,
      completed_at: operation.completed_at
    };
  } catch (error) {
    console.error('Error getting batch operation:', error);
    throw error;
  }
};

/**
 * Get organization batch operations
 * @param {string} orgId - Organization ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Batch operations
 */
const getOrganizationBatchOperations = async (orgId, options = {}) => {
  try {
    const {
      status,
      operationType,
      userId,
      limit = 20,
      offset = 0
    } = options;
    
    // Build query
    let query = db('batch_operations')
      .where('org_id', orgId);
    
    // Apply filters
    if (status) {
      query = query.where('status', status);
    }
    
    if (operationType) {
      query = query.where('operation_type', operationType);
    }
    
    if (userId) {
      query = query.where('user_id', userId);
    }
    
    // Apply pagination
    query = query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    // Get operations
    const operations = await query;
    
    // Format operations
    return operations.map(op => ({
      id: op.id,
      operation_type: op.operation_type,
      status: op.status,
      created_at: op.created_at,
      updated_at: op.updated_at,
      completed_at: op.completed_at
    }));
  } catch (error) {
    console.error('Error getting organization batch operations:', error);
    throw error;
  }
};

/**
 * Process CSV file for batch operation
 * @param {Buffer} fileBuffer - CSV file buffer
 * @param {Object} options - Processing options
 * @returns {Promise<Array>} - Parsed CSV data
 */
const processCsvFile = async (fileBuffer, options = {}) => {
  try {
    const results = [];
    
    // Create readable stream from buffer
    const stream = Readable.from(fileBuffer.toString());
    
    // Process CSV
    return new Promise((resolve, reject) => {
      stream
        .pipe(csv(options))
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  } catch (error) {
    console.error('Error processing CSV file:', error);
    throw error;
  }
};

/**
 * Create envelopes in batch
 * @param {string} batchId - Batch operation ID
 * @param {string} orgId - Organization ID
 * @param {string} userId - User ID
 * @param {Array} envelopeData - Envelope data
 * @returns {Promise<Object>} - Batch results
 */
const createEnvelopesBatch = async (batchId, orgId, userId, envelopeData) => {
  try {
    const results = {
      total: envelopeData.length,
      successful: 0,
      failed: 0,
      envelopes: []
    };
    
    // Update batch operation status to processing
    await updateBatchOperationStatus(batchId, 'processing');
    
    // Process each envelope
    for (const envelope of envelopeData) {
      try {
        // Create envelope
        const envelopeId = uuidv4();
        await db('envelopes').insert({
          id: envelopeId,
          org_id: orgId,
          name: envelope.name,
          description: envelope.description || null,
          status: 'draft',
          created_by: userId,
          created_at: db.fn.now()
        });
        
        results.successful++;
        results.envelopes.push({
          success: true,
          envelope_id: envelopeId,
          name: envelope.name
        });
      } catch (error) {
        console.error('Error creating envelope in batch:', error);
        results.failed++;
        results.envelopes.push({
          success: false,
          name: envelope.name,
          error: error.message
        });
      }
    }
    
    // Update batch operation status to completed
    await updateBatchOperationStatus(batchId, 'completed', results);
    
    return results;
  } catch (error) {
    console.error('Error processing batch envelopes:', error);
    
    // Update batch operation status to failed
    await updateBatchOperationStatus(batchId, 'failed', {
      error: error.message
    });
    
    throw error;
  }
};

/**
 * Add documents to envelope in batch
 * @param {string} batchId - Batch operation ID
 * @param {string} envelopeId - Envelope ID
 * @param {string} orgId - Organization ID
 * @param {string} userId - User ID
 * @param {Array} files - Document files
 * @returns {Promise<Object>} - Batch results
 */
const addDocumentsBatch = async (batchId, envelopeId, orgId, userId, files) => {
  try {
    const results = {
      total: files.length,
      successful: 0,
      failed: 0,
      documents: []
    };
    
    // Update batch operation status to processing
    await updateBatchOperationStatus(batchId, 'processing');
    
    // Check if envelope exists
    const envelope = await db('envelopes')
      .where('id', envelopeId)
      .first();
    
    if (!envelope) {
      throw new Error('Envelope not found');
    }
    
    // Create document directory if it doesn't exist
    const documentDir = path.join(__dirname, '..', 'uploads', 'documents');
    if (!fs.existsSync(documentDir)) {
      fs.mkdirSync(documentDir, { recursive: true });
    }
    
    // Process each file
    for (const file of files) {
      try {
        // Generate document ID
        const documentId = uuidv4();
        
        // Save file
        const fileName = `${documentId}_${file.originalname}`;
        const filePath = path.join(documentDir, fileName);
        fs.writeFileSync(filePath, file.buffer);
        
        // Get file size
        const stats = fs.statSync(filePath);
        const fileSize = stats.size;
        
        // Create document record
        await db('documents').insert({
          id: documentId,
          envelope_id: envelopeId,
          org_id: orgId,
          name: file.originalname,
          file_path: filePath,
          file_name: file.originalname,
          file_size: fileSize,
          file_type: file.mimetype,
          status: 'draft',
          created_by: userId,
          created_at: db.fn.now()
        });
        
        results.successful++;
        results.documents.push({
          success: true,
          document_id: documentId,
          name: file.originalname
        });
      } catch (error) {
        console.error('Error adding document in batch:', error);
        results.failed++;
        results.documents.push({
          success: false,
          name: file.originalname,
          error: error.message
        });
      }
    }
    
    // Update batch operation status to completed
    await updateBatchOperationStatus(batchId, 'completed', results);
    
    return results;
  } catch (error) {
    console.error('Error processing batch documents:', error);
    
    // Update batch operation status to failed
    await updateBatchOperationStatus(batchId, 'failed', {
      error: error.message
    });
    
    throw error;
  }
};

/**
 * Add signers to envelope in batch
 * @param {string} batchId - Batch operation ID
 * @param {string} envelopeId - Envelope ID
 * @param {string} orgId - Organization ID
 * @param {Array} signerData - Signer data
 * @returns {Promise<Object>} - Batch results
 */
const addSignersBatch = async (batchId, envelopeId, orgId, signerData) => {
  try {
    const results = {
      total: signerData.length,
      successful: 0,
      failed: 0,
      signers: []
    };
    
    // Update batch operation status to processing
    await updateBatchOperationStatus(batchId, 'processing');
    
    // Check if envelope exists
    const envelope = await db('envelopes')
      .where('id', envelopeId)
      .first();
    
    if (!envelope) {
      throw new Error('Envelope not found');
    }
    
    // Process each signer
    for (const signer of signerData) {
      try {
        // Create signer
        const signerId = uuidv4();
        await db('signers').insert({
          id: signerId,
          envelope_id: envelopeId,
          org_id: orgId,
          first_name: signer.first_name,
          last_name: signer.last_name,
          email: signer.email,
          phone: signer.phone || null,
          signing_order: signer.signing_order || 1,
          role: signer.role || 'signer',
          status: 'pending',
          created_at: db.fn.now()
        });
        
        results.successful++;
        results.signers.push({
          success: true,
          signer_id: signerId,
          email: signer.email,
          name: `${signer.first_name} ${signer.last_name}`
        });
      } catch (error) {
        console.error('Error adding signer in batch:', error);
        results.failed++;
        results.signers.push({
          success: false,
          email: signer.email,
          name: `${signer.first_name} ${signer.last_name}`,
          error: error.message
        });
      }
    }
    
    // Update batch operation status to completed
    await updateBatchOperationStatus(batchId, 'completed', results);
    
    return results;
  } catch (error) {
    console.error('Error processing batch signers:', error);
    
    // Update batch operation status to failed
    await updateBatchOperationStatus(batchId, 'failed', {
      error: error.message
    });
    
    throw error;
  }
};

/**
 * Process batch operation
 * @param {string} batchId - Batch operation ID
 * @returns {Promise<Object>} - Batch results
 */
const processBatchOperation = async (batchId) => {
  try {
    // Get batch operation
    const operation = await getBatchOperation(batchId);
    
    // Check if operation is already processing or completed
    if (['processing', 'completed', 'failed'].includes(operation.status)) {
      return operation;
    }
    
    // Process based on operation type
    switch (operation.operation_type) {
      case 'create_envelopes':
        return await createEnvelopesBatch(
          batchId,
          operation.org_id,
          operation.user_id,
          operation.metadata.envelopes
        );
      
      case 'add_documents':
        return await addDocumentsBatch(
          batchId,
          operation.metadata.envelope_id,
          operation.org_id,
          operation.user_id,
          operation.metadata.files
        );
      
      case 'add_signers':
        return await addSignersBatch(
          batchId,
          operation.metadata.envelope_id,
          operation.org_id,
          operation.metadata.signers
        );
      
      default:
        throw new Error(`Unsupported batch operation type: ${operation.operation_type}`);
    }
  } catch (error) {
    console.error('Error processing batch operation:', error);
    throw error;
  }
};

module.exports = {
  createBatchOperation,
  updateBatchOperationStatus,
  getBatchOperation,
  getOrganizationBatchOperations,
  processCsvFile,
  createEnvelopesBatch,
  addDocumentsBatch,
  addSignersBatch,
  processBatchOperation
};
