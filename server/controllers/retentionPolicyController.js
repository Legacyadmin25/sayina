/**
 * Retention Policy Controller
 * 
 * This controller handles document retention policy management for the Sayina E-Signature platform,
 * ensuring compliance with legal requirements for document retention and destruction.
 */

const { ApiError } = require('../middleware/errorMiddleware');
const { 
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
} = require('../services/retentionPolicyService');
const { logSystemEvent } = require('../services/loggerService');
const { db } = require('../config/db');

/**
 * @desc    Create a retention policy
 * @route   POST /api/v1/retention/policies
 * @access  Private
 */
const createPolicy = async (req, res, next) => {
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
    } = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Validate required fields
    if (!name || !retention_period) {
      return next(new ApiError(400, 'Name and retention period are required'));
    }
    
    // Create policy
    const policyId = await createRetentionPolicy(orgId, {
      name,
      description,
      retention_period,
      document_types,
      auto_apply,
      auto_delete,
      notify_before_deletion,
      notification_days
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'retention_policy_created',
      metadata: {
        policy_id: policyId,
        policy_name: name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'Retention policy created successfully',
      data: {
        policy_id: policyId
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a retention policy
 * @route   PUT /api/v1/retention/policies/:id
 * @access  Private
 */
const updatePolicy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      retention_period,
      document_types,
      auto_apply,
      auto_delete,
      notify_before_deletion,
      notification_days
    } = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Check if policy exists and belongs to organization
    const policy = await getRetentionPolicy(id);
    
    if (policy.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to update this policy'));
    }
    
    // Update policy
    await updateRetentionPolicy(id, {
      name,
      description,
      retention_period,
      document_types,
      auto_apply,
      auto_delete,
      notify_before_deletion,
      notification_days
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'retention_policy_updated',
      metadata: {
        policy_id: id,
        policy_name: name || policy.name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Retention policy updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a retention policy
 * @route   DELETE /api/v1/retention/policies/:id
 * @access  Private
 */
const deletePolicy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Check if policy exists and belongs to organization
    const policy = await getRetentionPolicy(id);
    
    if (policy.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to delete this policy'));
    }
    
    // Delete policy
    await deleteRetentionPolicy(id);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'retention_policy_deleted',
      metadata: {
        policy_id: id,
        policy_name: policy.name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Retention policy deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a retention policy
 * @route   GET /api/v1/retention/policies/:id
 * @access  Private
 */
const getPolicyById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;
    
    // Get policy
    const policy = await getRetentionPolicy(id);
    
    // Check if policy belongs to organization
    if (policy.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to view this policy'));
    }
    
    res.status(200).json({
      success: true,
      data: policy
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get organization retention policies
 * @route   GET /api/v1/retention/policies
 * @access  Private
 */
const getOrgPolicies = async (req, res, next) => {
  try {
    const orgId = req.user.org_id;
    
    // Get policies
    const policies = await getOrganizationRetentionPolicies(orgId);
    
    res.status(200).json({
      success: true,
      count: policies.length,
      data: policies
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Apply retention policy to document
 * @route   POST /api/v1/retention/apply/document
 * @access  Private
 */
const applyPolicyToDocument = async (req, res, next) => {
  try {
    const { policy_id, document_id } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Validate required fields
    if (!policy_id || !document_id) {
      return next(new ApiError(400, 'Policy ID and document ID are required'));
    }
    
    // Check if policy exists and belongs to organization
    const policy = await getRetentionPolicy(policy_id);
    
    if (policy.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to use this policy'));
    }
    
    // Check if document exists and belongs to organization
    const document = await db('documents')
      .where('id', document_id)
      .where('org_id', orgId)
      .first();
    
    if (!document) {
      return next(new ApiError(404, 'Document not found or does not belong to your organization'));
    }
    
    // Apply policy
    const retentionId = await applyRetentionPolicyToDocument(policy_id, document_id);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'retention_policy_applied_to_document',
      metadata: {
        policy_id,
        document_id,
        retention_id: retentionId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Retention policy applied to document successfully',
      data: {
        retention_id: retentionId
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Apply retention policy to envelope
 * @route   POST /api/v1/retention/apply/envelope
 * @access  Private
 */
const applyPolicyToEnvelope = async (req, res, next) => {
  try {
    const { policy_id, envelope_id } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Validate required fields
    if (!policy_id || !envelope_id) {
      return next(new ApiError(400, 'Policy ID and envelope ID are required'));
    }
    
    // Check if policy exists and belongs to organization
    const policy = await getRetentionPolicy(policy_id);
    
    if (policy.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to use this policy'));
    }
    
    // Check if envelope exists and belongs to organization
    const envelope = await db('envelopes')
      .where('id', envelope_id)
      .where('org_id', orgId)
      .first();
    
    if (!envelope) {
      return next(new ApiError(404, 'Envelope not found or does not belong to your organization'));
    }
    
    // Apply policy
    const retentionIds = await applyRetentionPolicyToEnvelope(policy_id, envelope_id);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'retention_policy_applied_to_envelope',
      metadata: {
        policy_id,
        envelope_id,
        document_count: retentionIds.length
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: `Retention policy applied to ${retentionIds.length} documents in the envelope`,
      data: {
        retention_ids: retentionIds
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove retention policy from document
 * @route   DELETE /api/v1/retention/document/:documentId
 * @access  Private
 */
const removePolicyFromDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Check if document exists and belongs to organization
    const document = await db('documents')
      .where('id', documentId)
      .where('org_id', orgId)
      .first();
    
    if (!document) {
      return next(new ApiError(404, 'Document not found or does not belong to your organization'));
    }
    
    // Remove policy
    await removeRetentionPolicyFromDocument(documentId);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'retention_policy_removed_from_document',
      metadata: {
        document_id: documentId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Retention policy removed from document successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get document retention details
 * @route   GET /api/v1/retention/document/:documentId
 * @access  Private
 */
const getDocumentRetentionDetails = async (req, res, next) => {
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
    
    // Get retention details
    const retention = await getDocumentRetention(documentId);
    
    res.status(200).json({
      success: true,
      data: retention
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get documents expiring soon
 * @route   GET /api/v1/retention/expiring
 * @access  Private
 */
const getExpiringDocuments = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const orgId = req.user.org_id;
    
    // Get expiring documents
    const documents = await getDocumentsExpiringSoon(orgId, parseInt(days));
    
    res.status(200).json({
      success: true,
      count: documents.length,
      data: documents
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Process expired documents
 * @route   POST /api/v1/retention/process-expired
 * @access  Private
 */
const processExpired = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Process expired documents
    const results = await processExpiredDocuments(orgId);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'expired_documents_processed',
      metadata: {
        total: results.total,
        deleted: results.deleted,
        flagged: results.flagged,
        errors: results.errors
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: `Processed ${results.total} expired documents`,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Auto-apply retention policies
 * @route   POST /api/v1/retention/auto-apply
 * @access  Private
 */
const autoApplyPolicies = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Auto-apply policies
    const results = await autoApplyRetentionPolicies(orgId);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'retention_policies_auto_applied',
      metadata: {
        total: results.total,
        applied: results.applied,
        errors: results.errors
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: `Applied retention policies to ${results.applied} of ${results.total} documents`,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPolicy,
  updatePolicy,
  deletePolicy,
  getPolicyById,
  getOrgPolicies,
  applyPolicyToDocument,
  applyPolicyToEnvelope,
  removePolicyFromDocument,
  getDocumentRetentionDetails,
  getExpiringDocuments,
  processExpired,
  autoApplyPolicies
};
