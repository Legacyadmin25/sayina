/**
 * Retention Policy Service
 * 
 * This service manages document retention policies for the Sayina E-Signature platform,
 * ensuring compliance with legal requirements for document retention and destruction.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { logSystemEvent } = require('./loggerService');
const fs = require('fs');
const path = require('path');

/**
 * Create a retention policy
 * @param {string} orgId - Organization ID
 * @param {Object} policyData - Policy data
 * @returns {Promise<string>} - Policy ID
 */
const createRetentionPolicy = async (orgId, policyData) => {
  try {
    const {
      name,
      description,
      retention_period,
      document_types = [],
      auto_apply = false,
      auto_delete = false,
      notify_before_deletion = true,
      notification_days = 30
    } = policyData;
    
    // Validate retention period
    if (!retention_period || !retention_period.value || !retention_period.unit) {
      throw new Error('Invalid retention period');
    }
    
    // Create policy
    const policyId = uuidv4();
    await db('retention_policies').insert({
      id: policyId,
      org_id: orgId,
      name,
      description: description || null,
      retention_period: JSON.stringify(retention_period),
      document_types: JSON.stringify(document_types),
      auto_apply,
      auto_delete,
      notify_before_deletion,
      notification_days,
      created_at: db.fn.now()
    });
    
    return policyId;
  } catch (error) {
    console.error('Error creating retention policy:', error);
    throw error;
  }
};

/**
 * Update retention policy
 * @param {string} policyId - Policy ID
 * @param {Object} policyData - Updated policy data
 * @returns {Promise<boolean>} - Success status
 */
const updateRetentionPolicy = async (policyId, policyData) => {
  try {
    const {
      name,
      description,
      retention_period,
      document_types,
      auto_apply,
      auto_delete,
      notify_before_deletion,
      notification_days
    } = policyData;
    
    // Build update object
    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (retention_period !== undefined) updateData.retention_period = JSON.stringify(retention_period);
    if (document_types !== undefined) updateData.document_types = JSON.stringify(document_types);
    if (auto_apply !== undefined) updateData.auto_apply = auto_apply;
    if (auto_delete !== undefined) updateData.auto_delete = auto_delete;
    if (notify_before_deletion !== undefined) updateData.notify_before_deletion = notify_before_deletion;
    if (notification_days !== undefined) updateData.notification_days = notification_days;
    
    // Update policy
    await db('retention_policies')
      .where('id', policyId)
      .update(updateData);
    
    return true;
  } catch (error) {
    console.error('Error updating retention policy:', error);
    throw error;
  }
};

/**
 * Delete retention policy
 * @param {string} policyId - Policy ID
 * @returns {Promise<boolean>} - Success status
 */
const deleteRetentionPolicy = async (policyId) => {
  try {
    // Check if policy is applied to any documents
    const appliedDocuments = await db('document_retention')
      .where('policy_id', policyId)
      .count('id as count')
      .first();
    
    if (appliedDocuments.count > 0) {
      throw new Error('Cannot delete policy that is applied to documents');
    }
    
    // Delete policy
    await db('retention_policies')
      .where('id', policyId)
      .delete();
    
    return true;
  } catch (error) {
    console.error('Error deleting retention policy:', error);
    throw error;
  }
};

/**
 * Get retention policy by ID
 * @param {string} policyId - Policy ID
 * @returns {Promise<Object>} - Policy details
 */
const getRetentionPolicy = async (policyId) => {
  try {
    // Get policy
    const policy = await db('retention_policies')
      .where('id', policyId)
      .first();
    
    if (!policy) {
      throw new Error('Retention policy not found');
    }
    
    // Format policy
    return {
      id: policy.id,
      org_id: policy.org_id,
      name: policy.name,
      description: policy.description,
      retention_period: JSON.parse(policy.retention_period),
      document_types: JSON.parse(policy.document_types),
      auto_apply: policy.auto_apply,
      auto_delete: policy.auto_delete,
      notify_before_deletion: policy.notify_before_deletion,
      notification_days: policy.notification_days,
      created_at: policy.created_at,
      updated_at: policy.updated_at
    };
  } catch (error) {
    console.error('Error getting retention policy:', error);
    throw error;
  }
};

/**
 * Get organization retention policies
 * @param {string} orgId - Organization ID
 * @returns {Promise<Array>} - Retention policies
 */
const getOrganizationRetentionPolicies = async (orgId) => {
  try {
    // Get policies
    const policies = await db('retention_policies')
      .where('org_id', orgId)
      .orderBy('created_at', 'desc');
    
    // Format policies
    return policies.map(policy => ({
      id: policy.id,
      name: policy.name,
      description: policy.description,
      retention_period: JSON.parse(policy.retention_period),
      document_types: JSON.parse(policy.document_types),
      auto_apply: policy.auto_apply,
      auto_delete: policy.auto_delete,
      created_at: policy.created_at
    }));
  } catch (error) {
    console.error('Error getting organization retention policies:', error);
    throw error;
  }
};

/**
 * Apply retention policy to document
 * @param {string} policyId - Policy ID
 * @param {string} documentId - Document ID
 * @returns {Promise<string>} - Document retention ID
 */
const applyRetentionPolicyToDocument = async (policyId, documentId) => {
  try {
    // Get policy
    const policy = await getRetentionPolicy(policyId);
    
    // Get document
    const document = await db('documents')
      .where('id', documentId)
      .first();
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Check if document belongs to the same organization as the policy
    if (document.org_id !== policy.org_id) {
      throw new Error('Document and policy must belong to the same organization');
    }
    
    // Calculate expiration date based on retention period
    const now = new Date();
    let expirationDate = new Date(now);
    
    switch (policy.retention_period.unit) {
      case 'days':
        expirationDate.setDate(now.getDate() + policy.retention_period.value);
        break;
      case 'months':
        expirationDate.setMonth(now.getMonth() + policy.retention_period.value);
        break;
      case 'years':
        expirationDate.setFullYear(now.getFullYear() + policy.retention_period.value);
        break;
      default:
        throw new Error('Invalid retention period unit');
    }
    
    // Check if document already has a retention policy
    const existingRetention = await db('document_retention')
      .where('document_id', documentId)
      .first();
    
    if (existingRetention) {
      // Update existing retention
      await db('document_retention')
        .where('id', existingRetention.id)
        .update({
          policy_id: policyId,
          expiration_date: expirationDate,
          updated_at: db.fn.now()
        });
      
      return existingRetention.id;
    } else {
      // Create new retention
      const retentionId = uuidv4();
      await db('document_retention').insert({
        id: retentionId,
        document_id: documentId,
        policy_id: policyId,
        expiration_date: expirationDate,
        created_at: db.fn.now()
      });
      
      return retentionId;
    }
  } catch (error) {
    console.error('Error applying retention policy to document:', error);
    throw error;
  }
};

/**
 * Apply retention policy to envelope
 * @param {string} policyId - Policy ID
 * @param {string} envelopeId - Envelope ID
 * @returns {Promise<Array>} - Document retention IDs
 */
const applyRetentionPolicyToEnvelope = async (policyId, envelopeId) => {
  try {
    // Get documents in envelope
    const documents = await db('documents')
      .where('envelope_id', envelopeId);
    
    if (documents.length === 0) {
      throw new Error('No documents found in envelope');
    }
    
    // Apply policy to each document
    const retentionIds = [];
    for (const document of documents) {
      const retentionId = await applyRetentionPolicyToDocument(policyId, document.id);
      retentionIds.push(retentionId);
    }
    
    return retentionIds;
  } catch (error) {
    console.error('Error applying retention policy to envelope:', error);
    throw error;
  }
};

/**
 * Remove retention policy from document
 * @param {string} documentId - Document ID
 * @returns {Promise<boolean>} - Success status
 */
const removeRetentionPolicyFromDocument = async (documentId) => {
  try {
    // Delete document retention
    await db('document_retention')
      .where('document_id', documentId)
      .delete();
    
    return true;
  } catch (error) {
    console.error('Error removing retention policy from document:', error);
    throw error;
  }
};

/**
 * Get document retention details
 * @param {string} documentId - Document ID
 * @returns {Promise<Object>} - Retention details
 */
const getDocumentRetention = async (documentId) => {
  try {
    // Get document retention
    const retention = await db('document_retention')
      .where('document_id', documentId)
      .first();
    
    if (!retention) {
      return null;
    }
    
    // Get policy
    const policy = await getRetentionPolicy(retention.policy_id);
    
    return {
      id: retention.id,
      document_id: retention.document_id,
      policy: {
        id: policy.id,
        name: policy.name,
        description: policy.description,
        retention_period: policy.retention_period
      },
      expiration_date: retention.expiration_date,
      created_at: retention.created_at
    };
  } catch (error) {
    console.error('Error getting document retention:', error);
    throw error;
  }
};

/**
 * Get documents expiring soon
 * @param {string} orgId - Organization ID
 * @param {number} days - Days until expiration
 * @returns {Promise<Array>} - Expiring documents
 */
const getDocumentsExpiringSoon = async (orgId, days = 30) => {
  try {
    // Calculate date threshold
    const now = new Date();
    const threshold = new Date(now);
    threshold.setDate(now.getDate() + days);
    
    // Get expiring documents
    const expiringRetentions = await db('document_retention')
      .join('documents', 'document_retention.document_id', 'documents.id')
      .join('retention_policies', 'document_retention.policy_id', 'retention_policies.id')
      .where('documents.org_id', orgId)
      .whereBetween('document_retention.expiration_date', [now, threshold])
      .select(
        'document_retention.id as retention_id',
        'document_retention.expiration_date',
        'documents.id as document_id',
        'documents.name as document_name',
        'documents.envelope_id',
        'retention_policies.id as policy_id',
        'retention_policies.name as policy_name',
        'retention_policies.auto_delete'
      );
    
    // Get envelope details
    const envelopeIds = [...new Set(expiringRetentions.map(r => r.envelope_id))];
    const envelopes = await db('envelopes')
      .whereIn('id', envelopeIds)
      .select('id', 'name');
    
    // Create envelope lookup
    const envelopeLookup = {};
    envelopes.forEach(envelope => {
      envelopeLookup[envelope.id] = envelope;
    });
    
    // Format results
    return expiringRetentions.map(retention => ({
      retention_id: retention.retention_id,
      document: {
        id: retention.document_id,
        name: retention.document_name
      },
      envelope: envelopeLookup[retention.envelope_id],
      policy: {
        id: retention.policy_id,
        name: retention.policy_name,
        auto_delete: retention.auto_delete
      },
      expiration_date: retention.expiration_date,
      days_until_expiration: Math.ceil((new Date(retention.expiration_date) - now) / (1000 * 60 * 60 * 24))
    }));
  } catch (error) {
    console.error('Error getting documents expiring soon:', error);
    throw error;
  }
};

/**
 * Process expired documents
 * @param {string} orgId - Organization ID
 * @returns {Promise<Object>} - Processing results
 */
const processExpiredDocuments = async (orgId) => {
  try {
    // Get current date
    const now = new Date();
    
    // Get expired document retentions
    const expiredRetentions = await db('document_retention')
      .join('documents', 'document_retention.document_id', 'documents.id')
      .join('retention_policies', 'document_retention.policy_id', 'retention_policies.id')
      .where('documents.org_id', orgId)
      .where('document_retention.expiration_date', '<', now)
      .select(
        'document_retention.id as retention_id',
        'document_retention.document_id',
        'retention_policies.id as policy_id',
        'retention_policies.auto_delete'
      );
    
    // Process expired documents
    const results = {
      total: expiredRetentions.length,
      deleted: 0,
      flagged: 0,
      errors: 0
    };
    
    for (const retention of expiredRetentions) {
      try {
        if (retention.auto_delete) {
          // Delete document
          await deleteDocument(retention.document_id);
          results.deleted++;
        } else {
          // Flag document as expired
          await db('documents')
            .where('id', retention.document_id)
            .update({
              retention_expired: true,
              updated_at: db.fn.now()
            });
          results.flagged++;
        }
      } catch (error) {
        console.error(`Error processing expired document ${retention.document_id}:`, error);
        results.errors++;
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error processing expired documents:', error);
    throw error;
  }
};

/**
 * Delete document
 * @param {string} documentId - Document ID
 * @returns {Promise<boolean>} - Success status
 */
const deleteDocument = async (documentId) => {
  try {
    // Get document
    const document = await db('documents')
      .where('id', documentId)
      .first();
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Delete document file
    if (document.file_path && fs.existsSync(document.file_path)) {
      fs.unlinkSync(document.file_path);
    }
    
    // Delete document from database
    await db('documents')
      .where('id', documentId)
      .delete();
    
    // Delete document retention
    await db('document_retention')
      .where('document_id', documentId)
      .delete();
    
    return true;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

/**
 * Auto-apply retention policies to documents
 * @param {string} orgId - Organization ID
 * @returns {Promise<Object>} - Processing results
 */
const autoApplyRetentionPolicies = async (orgId) => {
  try {
    // Get auto-apply policies
    const policies = await db('retention_policies')
      .where('org_id', orgId)
      .where('auto_apply', true);
    
    if (policies.length === 0) {
      return {
        total: 0,
        applied: 0,
        errors: 0
      };
    }
    
    // Create document type to policy mapping
    const policyMap = {};
    policies.forEach(policy => {
      const documentTypes = JSON.parse(policy.document_types);
      documentTypes.forEach(type => {
        if (!policyMap[type]) {
          policyMap[type] = [];
        }
        policyMap[type].push(policy.id);
      });
    });
    
    // Get documents without retention policies
    const documents = await db('documents')
      .leftJoin('document_retention', 'documents.id', 'document_retention.document_id')
      .where('documents.org_id', orgId)
      .whereNull('document_retention.id')
      .select('documents.id', 'documents.document_type');
    
    // Apply policies
    const results = {
      total: documents.length,
      applied: 0,
      errors: 0
    };
    
    for (const document of documents) {
      try {
        // Check if document type has a matching policy
        const applicablePolicies = policyMap[document.document_type] || policyMap['*'];
        
        if (applicablePolicies && applicablePolicies.length > 0) {
          // Apply first matching policy
          await applyRetentionPolicyToDocument(applicablePolicies[0], document.id);
          results.applied++;
        }
      } catch (error) {
        console.error(`Error auto-applying retention policy to document ${document.id}:`, error);
        results.errors++;
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error auto-applying retention policies:', error);
    throw error;
  }
};

module.exports = {
  createRetentionPolicy,
  updateRetentionPolicy,
  deleteRetentionPolicy,
  getRetentionPolicy,
  getOrganizationRetentionPolicies,
  applyRetentionPolicyToDocument,
  applyRetentionPolicyToEnvelope,
  removeRetentionPolicyFromDocument,
  getDocumentRetention,
  getDocumentsExpiringSoon,
  processExpiredDocuments,
  autoApplyRetentionPolicies
};
