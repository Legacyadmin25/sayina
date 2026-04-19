const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/db');
const { ApiError } = require('../middleware/errorMiddleware');
const { generateAuditTrailPdf } = require('./pdfHelper');
const path = require('path');

/**
 * Record an audit event for an envelope
 * @param {Object} eventData - Event data
 * @returns {Promise<string>} - Event ID
 */
const recordAuditEvent = async (eventData) => {
  try {
    const {
      envelope_id,
      user_id = null,
      signer_id = null,
      action,
      ip_address = null,
      user_agent = null,
      metadata = {}
    } = eventData;

    // Validate required fields
    if (!envelope_id) {
      throw new Error('Envelope ID is required');
    }

    if (!action) {
      throw new Error('Action is required');
    }

    // Create event
    const [eventId] = await db('audit_trail').insert({
      id: uuidv4(),
      envelope_id,
      user_id,
      signer_id,
      action,
      ip_address,
      user_agent,
      metadata: JSON.stringify(metadata)
    }).returning('id');

    return eventId;
  } catch (error) {
    console.error('Error recording audit event:', error);
    throw new Error('Failed to record audit event');
  }
};

/**
 * Get audit trail for an envelope
 * @param {string} envelopeId - Envelope ID
 * @returns {Promise<Array>} - Audit trail events
 */
const getAuditTrail = async (envelopeId) => {
  try {
    // Get envelope details
    const envelope = await db('envelopes')
      .where('id', envelopeId)
      .first();

    if (!envelope) {
      throw new ApiError(404, 'Envelope not found');
    }

    // Get organization details
    const organization = await db('organizations')
      .where('id', envelope.org_id)
      .first();

    // Get signers
    const signers = await db('signers')
      .where('envelope_id', envelopeId)
      .orderBy('signing_order', 'asc');

    // Get documents
    const documents = await db('documents')
      .where('envelope_id', envelopeId)
      .orderBy('created_at', 'asc');

    // Get audit trail events
    const events = await db('audit_trail')
      .where('envelope_id', envelopeId)
      .leftJoin('users', 'audit_trail.user_id', 'users.id')
      .leftJoin('signers', 'audit_trail.signer_id', 'signers.id')
      .select(
        'audit_trail.*',
        'users.first_name as user_first_name',
        'users.last_name as user_last_name',
        'users.email as user_email',
        'signers.name as signer_name',
        'signers.email as signer_email'
      )
      .orderBy('audit_trail.created_at', 'asc');

    // Enhance events with user and signer information
    const enhancedEvents = events.map(event => {
      const enhancedEvent = {
        ...event,
        metadata: JSON.parse(event.metadata || '{}')
      };

      // Add user information if available
      if (event.user_id) {
        enhancedEvent.user = {
          id: event.user_id,
          name: `${event.user_first_name} ${event.user_last_name}`,
          email: event.user_email
        };
      }

      // Add signer information if available
      if (event.signer_id) {
        enhancedEvent.signer = {
          id: event.signer_id,
          name: event.signer_name,
          email: event.signer_email
        };
      }

      // Remove redundant fields
      delete enhancedEvent.user_first_name;
      delete enhancedEvent.user_last_name;
      delete enhancedEvent.user_email;
      delete enhancedEvent.signer_name;
      delete enhancedEvent.signer_email;

      return enhancedEvent;
    });

    return {
      envelope,
      organization,
      signers,
      documents,
      events: enhancedEvents
    };
  } catch (error) {
    console.error('Error getting audit trail:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to get audit trail');
  }
};

/**
 * Generate audit trail PDF
 * @param {string} envelopeId - Envelope ID
 * @returns {Promise<string>} - Path to audit trail PDF
 */
const generateAuditTrailDocument = async (envelopeId) => {
  try {
    // Get audit trail data
    const auditTrailData = await getAuditTrail(envelopeId);

    // Generate PDF filename
    const filename = `audit_trail_${envelopeId}_${Date.now()}.pdf`;
    const outputPath = path.join(__dirname, '../../uploads/audit', filename);

    // Generate PDF
    await generateAuditTrailPdf(auditTrailData, outputPath);

    // Record audit event
    await recordAuditEvent({
      envelope_id: envelopeId,
      action: 'audit_trail_generated',
      metadata: {
        filename
      }
    });

    return {
      success: true,
      filePath: outputPath,
      filename
    };
  } catch (error) {
    console.error('Error generating audit trail document:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to generate audit trail document');
  }
};

/**
 * Record envelope creation event
 * @param {string} envelopeId - Envelope ID
 * @param {string} userId - User ID
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<string>} - Event ID
 */
const recordEnvelopeCreated = async (envelopeId, userId, metadata = {}) => {
  return recordAuditEvent({
    envelope_id: envelopeId,
    user_id: userId,
    action: 'envelope_created',
    metadata
  });
};

/**
 * Record envelope sent event
 * @param {string} envelopeId - Envelope ID
 * @param {string} userId - User ID
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<string>} - Event ID
 */
const recordEnvelopeSent = async (envelopeId, userId, metadata = {}) => {
  return recordAuditEvent({
    envelope_id: envelopeId,
    user_id: userId,
    action: 'envelope_sent',
    metadata
  });
};

/**
 * Record document added event
 * @param {string} envelopeId - Envelope ID
 * @param {string} userId - User ID
 * @param {string} documentId - Document ID
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<string>} - Event ID
 */
const recordDocumentAdded = async (envelopeId, userId, documentId, metadata = {}) => {
  return recordAuditEvent({
    envelope_id: envelopeId,
    user_id: userId,
    action: 'document_added',
    metadata: {
      document_id: documentId,
      ...metadata
    }
  });
};

/**
 * Record signer added event
 * @param {string} envelopeId - Envelope ID
 * @param {string} userId - User ID
 * @param {string} signerId - Signer ID
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<string>} - Event ID
 */
const recordSignerAdded = async (envelopeId, userId, signerId, metadata = {}) => {
  return recordAuditEvent({
    envelope_id: envelopeId,
    user_id: userId,
    action: 'signer_added',
    metadata: {
      signer_id: signerId,
      ...metadata
    }
  });
};

/**
 * Record signer viewed event
 * @param {string} envelopeId - Envelope ID
 * @param {string} signerId - Signer ID
 * @param {string} ipAddress - IP address
 * @param {string} userAgent - User agent
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<string>} - Event ID
 */
const recordSignerViewed = async (envelopeId, signerId, ipAddress, userAgent, metadata = {}) => {
  return recordAuditEvent({
    envelope_id: envelopeId,
    signer_id: signerId,
    action: 'document_viewed',
    ip_address: ipAddress,
    user_agent: userAgent,
    metadata
  });
};

/**
 * Record signature added event
 * @param {string} envelopeId - Envelope ID
 * @param {string} signerId - Signer ID
 * @param {string} fieldId - Field ID
 * @param {string} ipAddress - IP address
 * @param {string} userAgent - User agent
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<string>} - Event ID
 */
const recordSignatureAdded = async (envelopeId, signerId, fieldId, ipAddress, userAgent, metadata = {}) => {
  return recordAuditEvent({
    envelope_id: envelopeId,
    signer_id: signerId,
    action: 'signature_added',
    ip_address: ipAddress,
    user_agent: userAgent,
    metadata: {
      field_id: fieldId,
      ...metadata
    }
  });
};

/**
 * Record document signed event
 * @param {string} envelopeId - Envelope ID
 * @param {string} signerId - Signer ID
 * @param {string} ipAddress - IP address
 * @param {string} userAgent - User agent
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<string>} - Event ID
 */
const recordDocumentSigned = async (envelopeId, signerId, ipAddress, userAgent, metadata = {}) => {
  return recordAuditEvent({
    envelope_id: envelopeId,
    signer_id: signerId,
    action: 'document_signed',
    ip_address: ipAddress,
    user_agent: userAgent,
    metadata
  });
};

/**
 * Record document declined event
 * @param {string} envelopeId - Envelope ID
 * @param {string} signerId - Signer ID
 * @param {string} reason - Decline reason
 * @param {string} ipAddress - IP address
 * @param {string} userAgent - User agent
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<string>} - Event ID
 */
const recordDocumentDeclined = async (envelopeId, signerId, reason, ipAddress, userAgent, metadata = {}) => {
  return recordAuditEvent({
    envelope_id: envelopeId,
    signer_id: signerId,
    action: 'document_declined',
    ip_address: ipAddress,
    user_agent: userAgent,
    metadata: {
      reason,
      ...metadata
    }
  });
};

/**
 * Record envelope completed event
 * @param {string} envelopeId - Envelope ID
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<string>} - Event ID
 */
const recordEnvelopeCompleted = async (envelopeId, metadata = {}) => {
  return recordAuditEvent({
    envelope_id: envelopeId,
    action: 'envelope_completed',
    metadata
  });
};

/**
 * Record envelope expired event
 * @param {string} envelopeId - Envelope ID
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<string>} - Event ID
 */
const recordEnvelopeExpired = async (envelopeId, metadata = {}) => {
  return recordAuditEvent({
    envelope_id: envelopeId,
    action: 'envelope_expired',
    metadata
  });
};

/**
 * Record envelope voided event
 * @param {string} envelopeId - Envelope ID
 * @param {string} userId - User ID
 * @param {string} reason - Void reason
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<string>} - Event ID
 */
const recordEnvelopeVoided = async (envelopeId, userId, reason, metadata = {}) => {
  return recordAuditEvent({
    envelope_id: envelopeId,
    user_id: userId,
    action: 'envelope_voided',
    metadata: {
      reason,
      ...metadata
    }
  });
};

/**
 * Record reminder sent event
 * @param {string} envelopeId - Envelope ID
 * @param {string} userId - User ID
 * @param {string} signerId - Signer ID
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<string>} - Event ID
 */
const recordReminderSent = async (envelopeId, userId, signerId, metadata = {}) => {
  return recordAuditEvent({
    envelope_id: envelopeId,
    user_id: userId,
    signer_id: signerId,
    action: 'reminder_sent',
    metadata
  });
};

/**
 * Record envelope downloaded event
 * @param {string} envelopeId - Envelope ID
 * @param {string} userId - User ID
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<string>} - Event ID
 */
const recordEnvelopeDownloaded = async (envelopeId, userId, metadata = {}) => {
  return recordAuditEvent({
    envelope_id: envelopeId,
    user_id: userId,
    action: 'envelope_downloaded',
    metadata
  });
};

module.exports = {
  recordAuditEvent,
  getAuditTrail,
  generateAuditTrailDocument,
  recordEnvelopeCreated,
  recordEnvelopeSent,
  recordDocumentAdded,
  recordSignerAdded,
  recordSignerViewed,
  recordSignatureAdded,
  recordDocumentSigned,
  recordDocumentDeclined,
  recordEnvelopeCompleted,
  recordEnvelopeExpired,
  recordEnvelopeVoided,
  recordReminderSent,
  recordEnvelopeDownloaded
};
