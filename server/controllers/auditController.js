const { ApiError } = require('../middleware/errorMiddleware');
const { db } = require('../config/db');
const { getAuditTrail, generateAuditTrailDocument } = require('../utils/auditTrailHelper');
const { validateDocumentDownloadToken } = require('../utils/signingUrlHelper');
const { logSystemEvent } = require('../services/loggerService');
const fs = require('fs');
const path = require('path');

/**
 * @desc    Get audit trail for envelope
 * @route   GET /api/v1/audit/envelope/:envelopeId
 * @access  Private
 */
const getEnvelopeAuditTrail = async (req, res, next) => {
  try {
    const { envelopeId } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if envelope exists and belongs to organization
    const envelope = await db('envelopes')
      .where('id', envelopeId)
      .where('org_id', orgId)
      .first();

    if (!envelope) {
      return next(new ApiError(404, 'Envelope not found or does not belong to your organization'));
    }

    // Get audit trail
    const auditTrail = await getAuditTrail(envelopeId);

    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'audit_trail_viewed',
      metadata: {
        envelope_id: envelopeId,
        envelope_name: envelope.name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      data: auditTrail
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate audit trail PDF for envelope
 * @route   POST /api/v1/audit/envelope/:envelopeId/generate
 * @access  Private
 */
const generateAuditTrail = async (req, res, next) => {
  try {
    const { envelopeId } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if envelope exists and belongs to organization
    const envelope = await db('envelopes')
      .where('id', envelopeId)
      .where('org_id', orgId)
      .first();

    if (!envelope) {
      return next(new ApiError(404, 'Envelope not found or does not belong to your organization'));
    }

    // Generate audit trail PDF
    const result = await generateAuditTrailDocument(envelopeId);

    if (!result.success) {
      return next(new ApiError(500, 'Failed to generate audit trail PDF'));
    }

    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'audit_trail_generated',
      metadata: {
        envelope_id: envelopeId,
        envelope_name: envelope.name,
        filename: result.filename
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Create audit trail record
    const _auditRecordIdResult = await db('audit_documents').insert({
      envelope_id: envelopeId,
      file_path: result.filePath,
      file_name: result.filename,
      generated_by: userId
    }).returning('id');
    const auditRecordId = _auditRecordIdResult[0]?.id ?? _auditRecordIdResult[0];

    res.status(200).json({
      success: true,
      message: 'Audit trail PDF generated successfully',
      data: {
        id: auditRecordId,
        envelope_id: envelopeId,
        file_name: result.filename,
        download_url: `/api/v1/audit/download/${auditRecordId}`
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download audit trail PDF
 * @route   GET /api/v1/audit/download/:auditId
 * @access  Private
 */
const downloadAuditTrail = async (req, res, next) => {
  try {
    const { auditId } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Get audit document
    const auditDocument = await db('audit_documents')
      .where('id', auditId)
      .first();

    if (!auditDocument) {
      return next(new ApiError(404, 'Audit document not found'));
    }

    // Check if envelope belongs to organization
    const envelope = await db('envelopes')
      .where('id', auditDocument.envelope_id)
      .where('org_id', orgId)
      .first();

    if (!envelope) {
      return next(new ApiError(403, 'You do not have permission to access this audit document'));
    }

    // Check if file exists
    if (!fs.existsSync(auditDocument.file_path)) {
      return next(new ApiError(404, 'Audit document file not found'));
    }

    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'audit_trail_downloaded',
      metadata: {
        envelope_id: auditDocument.envelope_id,
        audit_id: auditId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Send file
    res.download(auditDocument.file_path, auditDocument.file_name);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get audit trail PDF for envelope (public access with token)
 * @route   GET /api/v1/audit/envelope/:envelopeId/pdf
 * @access  Public (with token)
 */
const getPublicAuditTrail = async (req, res, next) => {
  try {
    const { envelopeId } = req.params;
    const { token, expires } = req.query;

    // Validate token
    if (!token || !expires) {
      return next(new ApiError(401, 'Invalid or missing token'));
    }

    const isValid = validateDocumentDownloadToken(envelopeId, token, expires);
    if (!isValid) {
      return next(new ApiError(401, 'Invalid or expired token'));
    }

    // Check if envelope exists
    const envelope = await db('envelopes')
      .where('id', envelopeId)
      .first();

    if (!envelope) {
      return next(new ApiError(404, 'Envelope not found'));
    }

    // Generate audit trail PDF if it doesn't exist
    let auditDocument = await db('audit_documents')
      .where('envelope_id', envelopeId)
      .orderBy('created_at', 'desc')
      .first();

    if (!auditDocument) {
      // Generate new audit trail
      const result = await generateAuditTrailDocument(envelopeId);

      if (!result.success) {
        return next(new ApiError(500, 'Failed to generate audit trail PDF'));
      }

      // Create audit trail record
      const _auditRecordIdResult2 = await db('audit_documents').insert({
        envelope_id: envelopeId,
        file_path: result.filePath,
        file_name: result.filename,
        generated_by: null // System generated
      }).returning('id');
      const auditRecordId = _auditRecordIdResult2[0]?.id ?? _auditRecordIdResult2[0];

      auditDocument = await db('audit_documents')
        .where('id', auditRecordId)
        .first();
    }

    // Check if file exists
    if (!fs.existsSync(auditDocument.file_path)) {
      return next(new ApiError(404, 'Audit document file not found'));
    }

    // Log event
    await logSystemEvent({
      action: 'audit_trail_accessed_public',
      metadata: {
        envelope_id: envelopeId,
        audit_id: auditDocument.id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Send file
    res.download(auditDocument.file_path, auditDocument.file_name);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get system audit logs
 * @route   GET /api/v1/audit/system
 * @access  Private (admin only)
 */
const getSystemAuditLogs = async (req, res, next) => {
  try {
    const { 
      startDate, 
      endDate, 
      action, 
      userId, 
      page = 1, 
      limit = 50 
    } = req.query;
    
    const orgId = req.user.org_id;
    const offset = (page - 1) * limit;

    // Build query
    let query = db('system_logs')
      .join('users', 'system_logs.user_id', 'users.id')
      .where('users.org_id', orgId)
      .select(
        'system_logs.*',
        'users.first_name',
        'users.last_name',
        'users.email'
      );

    // Apply filters
    if (startDate) {
      query = query.where('system_logs.created_at', '>=', new Date(startDate));
    }

    if (endDate) {
      query = query.where('system_logs.created_at', '<=', new Date(endDate));
    }

    if (action) {
      query = query.where('system_logs.action', action);
    }

    if (userId) {
      query = query.where('system_logs.user_id', userId);
    }

    // Get total count
    const countQuery = query.clone();
    const { count } = await countQuery.count('system_logs.id as count').first();

    // Get paginated results
    const logs = await query
      .orderBy('system_logs.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Format logs
    const formattedLogs = logs.map(log => ({
      id: log.id,
      action: log.action,
      metadata: JSON.parse(log.metadata || '{}'),
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      created_at: log.created_at,
      user: {
        id: log.user_id,
        name: `${log.first_name} ${log.last_name}`,
        email: log.email
      }
    }));

    res.status(200).json({
      success: true,
      count: parseInt(count),
      pages: Math.ceil(count / limit),
      current_page: parseInt(page),
      data: formattedLogs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get security audit logs
 * @route   GET /api/v1/audit/security
 * @access  Private (admin only)
 */
const getSecurityAuditLogs = async (req, res, next) => {
  try {
    const { 
      startDate, 
      endDate, 
      eventType, 
      userId, 
      page = 1, 
      limit = 50 
    } = req.query;
    
    const orgId = req.user.org_id;
    const offset = (page - 1) * limit;

    // Build query
    let query = db('security_events')
      .leftJoin('users', 'security_events.user_id', 'users.id')
      .where(function() {
        this.where('users.org_id', orgId)
          .orWhereNull('security_events.user_id');
      })
      .select(
        'security_events.*',
        'users.first_name',
        'users.last_name',
        'users.email'
      );

    // Apply filters
    if (startDate) {
      query = query.where('security_events.created_at', '>=', new Date(startDate));
    }

    if (endDate) {
      query = query.where('security_events.created_at', '<=', new Date(endDate));
    }

    if (eventType) {
      query = query.where('security_events.event_type', eventType);
    }

    if (userId) {
      query = query.where('security_events.user_id', userId);
    }

    // Get total count
    const countQuery = query.clone();
    const { count } = await countQuery.count('security_events.id as count').first();

    // Get paginated results
    const logs = await query
      .orderBy('security_events.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Format logs
    const formattedLogs = logs.map(log => ({
      id: log.id,
      event_type: log.event_type,
      metadata: JSON.parse(log.metadata || '{}'),
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      created_at: log.created_at,
      user: log.user_id ? {
        id: log.user_id,
        name: `${log.first_name} ${log.last_name}`,
        email: log.email
      } : null
    }));

    res.status(200).json({
      success: true,
      count: parseInt(count),
      pages: Math.ceil(count / limit),
      current_page: parseInt(page),
      data: formattedLogs
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEnvelopeAuditTrail,
  generateAuditTrail,
  downloadAuditTrail,
  getPublicAuditTrail,
  getSystemAuditLogs,
  getSecurityAuditLogs
};
