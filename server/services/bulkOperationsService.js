/**
 * Bulk Operations Service
 * 
 * This service handles batch processing of documents and envelopes
 * for the Sayina E-Signature platform.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { logSystemEvent } = require('./loggerService');
const { triggerWebhooks } = require('./webhookService');

/**
 * Process bulk envelope creation
 * @param {string} orgId - Organization ID
 * @param {string} userId - User ID
 * @param {Array} envelopes - Array of envelope data
 * @returns {Promise<Object>} - Processing result
 */
const processBulkEnvelopeCreation = async (orgId, userId, envelopes) => {
  try {
    if (!Array.isArray(envelopes) || envelopes.length === 0) {
      throw new Error('Invalid envelopes data');
    }
    
    // Create bulk operation record
    const [operationId] = await db('bulk_operations').insert({
      id: uuidv4(),
      org_id: orgId,
      user_id: userId,
      operation_type: 'envelope_creation',
      status: 'processing',
      total_items: envelopes.length,
      processed_items: 0,
      successful_items: 0,
      failed_items: 0
    }).returning('id');
    
    // Process envelopes
    const results = {
      successful: [],
      failed: []
    };
    
    for (const [index, envelopeData] of envelopes.entries()) {
      try {
        // Create envelope
        const [envelopeId] = await db('envelopes').insert({
          id: uuidv4(),
          org_id: orgId,
          name: envelopeData.name,
          description: envelopeData.description || null,
          status: 'draft',
          created_by: userId
        }).returning('id');
        
        // Process documents if provided
        if (Array.isArray(envelopeData.documents) && envelopeData.documents.length > 0) {
          for (const docData of envelopeData.documents) {
            await db('documents').insert({
              id: uuidv4(),
              envelope_id: envelopeId,
              org_id: orgId,
              name: docData.name,
              file_path: docData.file_path,
              file_name: docData.file_name,
              file_size: docData.file_size,
              file_type: docData.file_type,
              order: docData.order || 1,
              created_by: userId
            });
          }
        }
        
        // Process signers if provided
        if (Array.isArray(envelopeData.signers) && envelopeData.signers.length > 0) {
          for (const signerData of envelopeData.signers) {
            await db('signers').insert({
              id: uuidv4(),
              envelope_id: envelopeId,
              name: signerData.name,
              email: signerData.email,
              phone: signerData.phone || null,
              role: signerData.role || 'signer',
              status: 'pending',
              order: signerData.order || 1
            });
          }
        }
        
        // Update operation progress
        await db('bulk_operations')
          .where('id', operationId)
          .increment('processed_items', 1)
          .increment('successful_items', 1);
        
        // Add to successful results
        results.successful.push({
          index,
          envelope_id: envelopeId,
          name: envelopeData.name
        });
        
        // Trigger webhook
        await triggerWebhooks(orgId, 'envelope.created', {
          envelope_id: envelopeId,
          name: envelopeData.name,
          status: 'draft',
          bulk_operation: true
        });
      } catch (error) {
        // Update operation progress
        await db('bulk_operations')
          .where('id', operationId)
          .increment('processed_items', 1)
          .increment('failed_items', 1);
        
        // Add to failed results
        results.failed.push({
          index,
          name: envelopeData.name,
          error: error.message
        });
      }
    }
    
    // Update operation status
    await db('bulk_operations')
      .where('id', operationId)
      .update({
        status: 'completed',
        completed_at: db.fn.now(),
        result_data: JSON.stringify(results)
      });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'bulk_envelope_creation',
      metadata: {
        operation_id: operationId,
        total: envelopes.length,
        successful: results.successful.length,
        failed: results.failed.length
      }
    });
    
    return {
      operation_id: operationId,
      total: envelopes.length,
      successful: results.successful.length,
      failed: results.failed.length,
      results
    };
  } catch (error) {
    console.error('Error processing bulk envelope creation:', error);
    throw error;
  }
};

/**
 * Process bulk document upload
 * @param {string} orgId - Organization ID
 * @param {string} userId - User ID
 * @param {string} envelopeId - Envelope ID
 * @param {Array} documents - Array of document data
 * @returns {Promise<Object>} - Processing result
 */
const processBulkDocumentUpload = async (orgId, userId, envelopeId, documents) => {
  try {
    if (!Array.isArray(documents) || documents.length === 0) {
      throw new Error('Invalid documents data');
    }
    
    // Check if envelope exists and belongs to organization
    const envelope = await db('envelopes')
      .where('id', envelopeId)
      .where('org_id', orgId)
      .first();
    
    if (!envelope) {
      throw new Error('Envelope not found or does not belong to organization');
    }
    
    // Create bulk operation record
    const [operationId] = await db('bulk_operations').insert({
      id: uuidv4(),
      org_id: orgId,
      user_id: userId,
      operation_type: 'document_upload',
      status: 'processing',
      total_items: documents.length,
      processed_items: 0,
      successful_items: 0,
      failed_items: 0,
      reference_id: envelopeId
    }).returning('id');
    
    // Process documents
    const results = {
      successful: [],
      failed: []
    };
    
    for (const [index, docData] of documents.entries()) {
      try {
        // Create document
        const [documentId] = await db('documents').insert({
          id: uuidv4(),
          envelope_id: envelopeId,
          org_id: orgId,
          name: docData.name,
          file_path: docData.file_path,
          file_name: docData.file_name,
          file_size: docData.file_size,
          file_type: docData.file_type,
          order: docData.order || (index + 1),
          created_by: userId
        }).returning('id');
        
        // Update operation progress
        await db('bulk_operations')
          .where('id', operationId)
          .increment('processed_items', 1)
          .increment('successful_items', 1);
        
        // Add to successful results
        results.successful.push({
          index,
          document_id: documentId,
          name: docData.name
        });
        
        // Trigger webhook
        await triggerWebhooks(orgId, 'document.created', {
          document_id: documentId,
          envelope_id: envelopeId,
          name: docData.name,
          bulk_operation: true
        });
      } catch (error) {
        // Update operation progress
        await db('bulk_operations')
          .where('id', operationId)
          .increment('processed_items', 1)
          .increment('failed_items', 1);
        
        // Add to failed results
        results.failed.push({
          index,
          name: docData.name,
          error: error.message
        });
      }
    }
    
    // Update operation status
    await db('bulk_operations')
      .where('id', operationId)
      .update({
        status: 'completed',
        completed_at: db.fn.now(),
        result_data: JSON.stringify(results)
      });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'bulk_document_upload',
      metadata: {
        operation_id: operationId,
        envelope_id: envelopeId,
        total: documents.length,
        successful: results.successful.length,
        failed: results.failed.length
      }
    });
    
    return {
      operation_id: operationId,
      envelope_id: envelopeId,
      total: documents.length,
      successful: results.successful.length,
      failed: results.failed.length,
      results
    };
  } catch (error) {
    console.error('Error processing bulk document upload:', error);
    throw error;
  }
};

/**
 * Process bulk signer addition
 * @param {string} orgId - Organization ID
 * @param {string} userId - User ID
 * @param {string} envelopeId - Envelope ID
 * @param {Array} signers - Array of signer data
 * @returns {Promise<Object>} - Processing result
 */
const processBulkSignerAddition = async (orgId, userId, envelopeId, signers) => {
  try {
    if (!Array.isArray(signers) || signers.length === 0) {
      throw new Error('Invalid signers data');
    }
    
    // Check if envelope exists and belongs to organization
    const envelope = await db('envelopes')
      .where('id', envelopeId)
      .where('org_id', orgId)
      .first();
    
    if (!envelope) {
      throw new Error('Envelope not found or does not belong to organization');
    }
    
    // Create bulk operation record
    const [operationId] = await db('bulk_operations').insert({
      id: uuidv4(),
      org_id: orgId,
      user_id: userId,
      operation_type: 'signer_addition',
      status: 'processing',
      total_items: signers.length,
      processed_items: 0,
      successful_items: 0,
      failed_items: 0,
      reference_id: envelopeId
    }).returning('id');
    
    // Process signers
    const results = {
      successful: [],
      failed: []
    };
    
    for (const [index, signerData] of signers.entries()) {
      try {
        // Create signer
        const [signerId] = await db('signers').insert({
          id: uuidv4(),
          envelope_id: envelopeId,
          name: signerData.name,
          email: signerData.email,
          phone: signerData.phone || null,
          role: signerData.role || 'signer',
          status: 'pending',
          order: signerData.order || (index + 1)
        }).returning('id');
        
        // Update operation progress
        await db('bulk_operations')
          .where('id', operationId)
          .increment('processed_items', 1)
          .increment('successful_items', 1);
        
        // Add to successful results
        results.successful.push({
          index,
          signer_id: signerId,
          name: signerData.name,
          email: signerData.email
        });
        
        // Trigger webhook
        await triggerWebhooks(orgId, 'signer.created', {
          signer_id: signerId,
          envelope_id: envelopeId,
          name: signerData.name,
          email: signerData.email,
          bulk_operation: true
        });
      } catch (error) {
        // Update operation progress
        await db('bulk_operations')
          .where('id', operationId)
          .increment('processed_items', 1)
          .increment('failed_items', 1);
        
        // Add to failed results
        results.failed.push({
          index,
          name: signerData.name,
          email: signerData.email,
          error: error.message
        });
      }
    }
    
    // Update operation status
    await db('bulk_operations')
      .where('id', operationId)
      .update({
        status: 'completed',
        completed_at: db.fn.now(),
        result_data: JSON.stringify(results)
      });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'bulk_signer_addition',
      metadata: {
        operation_id: operationId,
        envelope_id: envelopeId,
        total: signers.length,
        successful: results.successful.length,
        failed: results.failed.length
      }
    });
    
    return {
      operation_id: operationId,
      envelope_id: envelopeId,
      total: signers.length,
      successful: results.successful.length,
      failed: results.failed.length,
      results
    };
  } catch (error) {
    console.error('Error processing bulk signer addition:', error);
    throw error;
  }
};

/**
 * Get bulk operation status
 * @param {string} operationId - Operation ID
 * @returns {Promise<Object>} - Operation status
 */
const getBulkOperationStatus = async (operationId) => {
  try {
    // Get operation
    const operation = await db('bulk_operations')
      .where('id', operationId)
      .first();
    
    if (!operation) {
      throw new Error('Bulk operation not found');
    }
    
    // Format response
    return {
      id: operation.id,
      org_id: operation.org_id,
      user_id: operation.user_id,
      operation_type: operation.operation_type,
      status: operation.status,
      total_items: operation.total_items,
      processed_items: operation.processed_items,
      successful_items: operation.successful_items,
      failed_items: operation.failed_items,
      reference_id: operation.reference_id,
      created_at: operation.created_at,
      completed_at: operation.completed_at,
      results: operation.result_data ? JSON.parse(operation.result_data) : null
    };
  } catch (error) {
    console.error('Error getting bulk operation status:', error);
    throw error;
  }
};

/**
 * Get organization bulk operations
 * @param {string} orgId - Organization ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Bulk operations
 */
const getOrganizationBulkOperations = async (orgId, options = {}) => {
  try {
    const {
      limit = 20,
      offset = 0,
      operation_type,
      status
    } = options;
    
    // Build query
    let query = db('bulk_operations')
      .where('org_id', orgId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    // Filter by operation type if provided
    if (operation_type) {
      query = query.where('operation_type', operation_type);
    }
    
    // Filter by status if provided
    if (status) {
      query = query.where('status', status);
    }
    
    // Get operations
    const operations = await query;
    
    // Format operations
    return operations.map(operation => ({
      id: operation.id,
      operation_type: operation.operation_type,
      status: operation.status,
      total_items: operation.total_items,
      processed_items: operation.processed_items,
      successful_items: operation.successful_items,
      failed_items: operation.failed_items,
      reference_id: operation.reference_id,
      created_at: operation.created_at,
      completed_at: operation.completed_at
    }));
  } catch (error) {
    console.error('Error getting organization bulk operations:', error);
    throw error;
  }
};

module.exports = {
  processBulkEnvelopeCreation,
  processBulkDocumentUpload,
  processBulkSignerAddition,
  getBulkOperationStatus,
  getOrganizationBulkOperations
};
