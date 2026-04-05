const { db } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Log system event
 * @param {Object} data - Log data
 * @returns {Promise<string>} - Log ID
 */
const logSystemEvent = async (data) => {
  try {
    const {
      user_id = null,
      action,
      metadata = {},
      ip_address = null,
      user_agent = null
    } = data;

    // Create log entry
    const [logId] = await db('system_logs').insert({
      id: uuidv4(),
      user_id,
      action,
      metadata: JSON.stringify(metadata),
      ip_address,
      user_agent
    }).returning('id');
    
    return logId;
  } catch (error) {
    console.error('Error logging system event:', error);
    // Don't throw error to prevent affecting main flow
    return null;
  }
};

/**
 * Log authentication event
 * @param {Object} data - Log data
 * @returns {Promise<string>} - Log ID
 */
const logAuthEvent = async (data) => {
  try {
    const {
      user_id,
      action,
      success,
      metadata = {},
      ip_address = null,
      user_agent = null
    } = data;

    // Create log entry
    const [logId] = await db('auth_logs').insert({
      id: uuidv4(),
      user_id,
      action,
      success,
      metadata: JSON.stringify(metadata),
      ip_address,
      user_agent
    }).returning('id');
    
    return logId;
  } catch (error) {
    console.error('Error logging auth event:', error);
    // Don't throw error to prevent affecting main flow
    return null;
  }
};

/**
 * Log payment event
 * @param {Object} data - Log data
 * @returns {Promise<string>} - Log ID
 */
const logPaymentEvent = async (data) => {
  try {
    const {
      org_id,
      user_id = null,
      payment_id,
      payment_type,
      payment_status,
      amount,
      currency,
      metadata = {}
    } = data;

    // Create log entry
    const [logId] = await db('payment_logs').insert({
      id: uuidv4(),
      org_id,
      user_id,
      payment_id,
      payment_type,
      payment_status,
      amount,
      currency,
      metadata: JSON.stringify(metadata)
    }).returning('id');
    
    return logId;
  } catch (error) {
    console.error('Error logging payment event:', error);
    // Don't throw error to prevent affecting main flow
    return null;
  }
};

/**
 * Log SMS event
 * @param {Object} data - Log data
 * @returns {Promise<string>} - Log ID
 */
const logSmsEvent = async (data) => {
  try {
    const {
      org_id,
      user_id = null,
      recipient,
      message_id = null,
      status,
      count = 1,
      purpose,
      metadata = {}
    } = data;

    // Create log entry
    const [logId] = await db('sms_logs').insert({
      id: uuidv4(),
      org_id,
      user_id,
      recipient,
      message_id,
      status,
      count,
      purpose,
      metadata: JSON.stringify(metadata)
    }).returning('id');
    
    return logId;
  } catch (error) {
    console.error('Error logging SMS event:', error);
    // Don't throw error to prevent affecting main flow
    return null;
  }
};

/**
 * Log envelope event
 * @param {Object} data - Log data
 * @returns {Promise<string>} - Log ID
 */
const logEnvelopeEvent = async (data) => {
  try {
    const {
      envelope_id,
      user_id = null,
      action,
      metadata = {},
      ip_address = null,
      user_agent = null
    } = data;

    // Get envelope details
    const envelope = await db('envelopes')
      .where({ id: envelope_id })
      .first();
    
    if (!envelope) {
      throw new Error('Envelope not found');
    }

    // Create log entry
    const [logId] = await db('envelope_logs').insert({
      id: uuidv4(),
      envelope_id,
      org_id: envelope.org_id,
      user_id,
      action,
      metadata: JSON.stringify(metadata),
      ip_address,
      user_agent
    }).returning('id');
    
    return logId;
  } catch (error) {
    console.error('Error logging envelope event:', error);
    // Don't throw error to prevent affecting main flow
    return null;
  }
};

/**
 * Log document event
 * @param {Object} data - Log data
 * @returns {Promise<string>} - Log ID
 */
const logDocumentEvent = async (data) => {
  try {
    const {
      document_id,
      envelope_id,
      user_id = null,
      action,
      metadata = {},
      ip_address = null,
      user_agent = null
    } = data;

    // Get document details
    const document = await db('documents')
      .where({ id: document_id })
      .first();
    
    if (!document) {
      throw new Error('Document not found');
    }

    // Get envelope details
    const envelope = await db('envelopes')
      .where({ id: envelope_id || document.envelope_id })
      .first();
    
    if (!envelope) {
      throw new Error('Envelope not found');
    }

    // Create log entry
    const [logId] = await db('document_logs').insert({
      id: uuidv4(),
      document_id,
      envelope_id: envelope.id,
      org_id: envelope.org_id,
      user_id,
      action,
      metadata: JSON.stringify(metadata),
      ip_address,
      user_agent
    }).returning('id');
    
    return logId;
  } catch (error) {
    console.error('Error logging document event:', error);
    // Don't throw error to prevent affecting main flow
    return null;
  }
};

/**
 * Log signer event
 * @param {Object} data - Log data
 * @returns {Promise<string>} - Log ID
 */
const logSignerEvent = async (data) => {
  try {
    const {
      signer_id,
      envelope_id,
      user_id = null,
      action,
      metadata = {},
      ip_address = null,
      user_agent = null
    } = data;

    // Get signer details
    const signer = await db('signers')
      .where({ id: signer_id })
      .first();
    
    if (!signer) {
      throw new Error('Signer not found');
    }

    // Get envelope details
    const envelope = await db('envelopes')
      .where({ id: envelope_id || signer.envelope_id })
      .first();
    
    if (!envelope) {
      throw new Error('Envelope not found');
    }

    // Create log entry
    const [logId] = await db('signer_logs').insert({
      id: uuidv4(),
      signer_id,
      envelope_id: envelope.id,
      org_id: envelope.org_id,
      user_id,
      action,
      metadata: JSON.stringify(metadata),
      ip_address,
      user_agent
    }).returning('id');
    
    return logId;
  } catch (error) {
    console.error('Error logging signer event:', error);
    // Don't throw error to prevent affecting main flow
    return null;
  }
};

/**
 * Log API access event
 * @param {Object} data - Log data
 * @returns {Promise<string>} - Log ID
 */
const logApiAccess = async (data) => {
  try {
    const {
      org_id,
      user_id = null,
      api_key_id,
      endpoint,
      method,
      status_code,
      response_time,
      ip_address = null,
      user_agent = null
    } = data;

    // Create log entry
    const [logId] = await db('api_logs').insert({
      id: uuidv4(),
      org_id,
      user_id,
      api_key_id,
      endpoint,
      method,
      status_code,
      response_time,
      ip_address,
      user_agent
    }).returning('id');
    
    return logId;
  } catch (error) {
    console.error('Error logging API access:', error);
    // Don't throw error to prevent affecting main flow
    return null;
  }
};

module.exports = {
  logSystemEvent,
  logAuthEvent,
  logPaymentEvent,
  logSmsEvent,
  logEnvelopeEvent,
  logDocumentEvent,
  logSignerEvent,
  logApiAccess
};
