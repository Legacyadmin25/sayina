/**
 * Mobile Optimization Service
 * 
 * This service provides functionality for optimizing the Sayina E-Signature platform for mobile devices,
 * including responsive signing experiences, touch-friendly interfaces, and mobile notifications.
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { db } = require('../config/db');
const { sendSMS } = require('../utils/smsHelper');
const { logSystemEvent } = require('./loggerService');

/**
 * Generate mobile-optimized signing URL
 * @param {string} envelopeId - Envelope ID
 * @param {string} signerId - Signer ID
 * @param {Object} options - Options for mobile signing
 * @returns {Promise<Object>} - Mobile signing details
 */
const generateMobileSigningUrl = async (envelopeId, signerId, options = {}) => {
  try {
    // Get envelope and signer
    const envelope = await db('envelopes')
      .where('id', envelopeId)
      .first();
    
    if (!envelope) {
      throw new Error('Envelope not found');
    }
    
    const signer = await db('signers')
      .where('id', signerId)
      .where('envelope_id', envelopeId)
      .first();
    
    if (!signer) {
      throw new Error('Signer not found');
    }
    
    // Generate token
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour expiration
    
    // Create mobile signing session
    const sessionId = uuidv4();
    await db('mobile_signing_sessions').insert({
      id: sessionId,
      envelope_id: envelopeId,
      signer_id: signerId,
      org_id: envelope.org_id,
      token,
      expires_at: expiresAt,
      settings: JSON.stringify(options),
      created_at: db.fn.now()
    });
    
    // Generate URL
    const baseUrl = process.env.BASE_URL || 'https://sayina.co.za';
    const mobileUrl = `${baseUrl}/m/sign/${token}`;
    
    // Create QR code data
    const qrCodeData = {
      url: mobileUrl,
      envelope_id: envelopeId,
      signer_id: signerId,
      expires_at: expiresAt
    };
    
    return {
      session_id: sessionId,
      token,
      mobile_url: mobileUrl,
      qr_code_data: qrCodeData,
      expires_at: expiresAt
    };
  } catch (error) {
    console.error('Error generating mobile signing URL:', error);
    throw error;
  }
};

/**
 * Validate mobile signing token
 * @param {string} token - Mobile signing token
 * @returns {Promise<Object>} - Signing session details
 */
const validateMobileSigningToken = async (token) => {
  try {
    // Get signing session
    const session = await db('mobile_signing_sessions')
      .where('token', token)
      .first();
    
    if (!session) {
      throw new Error('Invalid mobile signing token');
    }
    
    // Check if expired
    const now = new Date();
    const expiresAt = new Date(session.expires_at);
    
    if (now > expiresAt) {
      throw new Error('Mobile signing session has expired');
    }
    
    // Get envelope and signer
    const envelope = await db('envelopes')
      .where('id', session.envelope_id)
      .first();
    
    const signer = await db('signers')
      .where('id', session.signer_id)
      .first();
    
    // Get documents
    const documents = await db('documents')
      .where('envelope_id', session.envelope_id)
      .orderBy('created_at', 'asc');
    
    // Update session last accessed
    await db('mobile_signing_sessions')
      .where('id', session.id)
      .update({
        last_accessed_at: db.fn.now()
      });
    
    return {
      session_id: session.id,
      envelope_id: session.envelope_id,
      signer_id: session.signer_id,
      envelope_name: envelope.name,
      signer_name: `${signer.first_name} ${signer.last_name}`,
      signer_email: signer.email,
      documents: documents.map(doc => ({
        id: doc.id,
        name: doc.name,
        file_type: doc.file_type
      })),
      settings: JSON.parse(session.settings)
    };
  } catch (error) {
    console.error('Error validating mobile signing token:', error);
    throw error;
  }
};

/**
 * Optimize document for mobile viewing
 * @param {string} documentId - Document ID
 * @returns {Promise<string>} - Path to optimized document
 */
const optimizeDocumentForMobile = async (documentId) => {
  try {
    // Get document
    const document = await db('documents')
      .where('id', documentId)
      .first();
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Check if already optimized
    const existingOptimized = await db('mobile_optimized_documents')
      .where('document_id', documentId)
      .first();
    
    if (existingOptimized) {
      return existingOptimized.file_path;
    }
    
    // Read document file
    const fileBuffer = fs.readFileSync(document.file_path);
    
    // Load PDF
    const pdfDoc = await PDFDocument.load(fileBuffer);
    
    // Get pages
    const pages = pdfDoc.getPages();
    
    // Process each page for mobile optimization
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      
      // If page is landscape, rotate it to portrait for better mobile viewing
      if (width > height) {
        page.setRotation({
          angle: 90,
        });
      }
    }
    
    // Save optimized PDF
    const pdfBytes = await pdfDoc.save();
    
    // Create optimized document directory if it doesn't exist
    const optimizedDir = path.join(__dirname, '..', 'uploads', 'mobile_optimized');
    if (!fs.existsSync(optimizedDir)) {
      fs.mkdirSync(optimizedDir, { recursive: true });
    }
    
    // Save optimized document
    const optimizedFileName = `${documentId}_mobile_${Date.now()}.pdf`;
    const optimizedFilePath = path.join(optimizedDir, optimizedFileName);
    fs.writeFileSync(optimizedFilePath, pdfBytes);
    
    // Create record
    const optimizedId = uuidv4();
    await db('mobile_optimized_documents').insert({
      id: optimizedId,
      document_id: documentId,
      org_id: document.org_id,
      file_path: optimizedFilePath,
      file_size: pdfBytes.length,
      created_at: db.fn.now()
    });
    
    return optimizedFilePath;
  } catch (error) {
    console.error('Error optimizing document for mobile:', error);
    throw error;
  }
};

/**
 * Send mobile signing notification
 * @param {string} signerId - Signer ID
 * @param {string} mobileUrl - Mobile signing URL
 * @returns {Promise<boolean>} - Success status
 */
const sendMobileSigningNotification = async (signerId, mobileUrl) => {
  try {
    // Get signer
    const signer = await db('signers')
      .where('id', signerId)
      .first();
    
    if (!signer) {
      throw new Error('Signer not found');
    }
    
    // Check if signer has phone
    if (!signer.phone) {
      throw new Error('Signer does not have a phone number');
    }
    
    // Get envelope
    const envelope = await db('envelopes')
      .where('id', signer.envelope_id)
      .first();
    
    // Send SMS
    const message = `You have a document to sign from Sayina E-Signature: "${envelope.name}". Sign on your mobile device: ${mobileUrl}`;
    
    const smsResult = await sendSMS(signer.phone, message);
    
    // Log notification
    await db('notification_logs').insert({
      id: uuidv4(),
      recipient_id: signerId,
      recipient_type: 'signer',
      notification_type: 'sms',
      content: message,
      status: smsResult.success ? 'delivered' : 'failed',
      metadata: JSON.stringify(smsResult),
      created_at: db.fn.now()
    });
    
    return smsResult.success;
  } catch (error) {
    console.error('Error sending mobile signing notification:', error);
    throw error;
  }
};

/**
 * Process touch signature
 * @param {string} signerId - Signer ID
 * @param {Object} signatureData - Signature data
 * @returns {Promise<string>} - Path to signature image
 */
const processTouchSignature = async (signerId, signatureData) => {
  try {
    // Get signer
    const signer = await db('signers')
      .where('id', signerId)
      .first();
    
    if (!signer) {
      throw new Error('Signer not found');
    }
    
    // Process signature data (base64 image)
    const { image, type = 'drawn' } = signatureData;
    
    if (!image) {
      throw new Error('Signature image data is required');
    }
    
    // Remove data URL prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Create signatures directory if it doesn't exist
    const signaturesDir = path.join(__dirname, '..', 'uploads', 'signatures');
    if (!fs.existsSync(signaturesDir)) {
      fs.mkdirSync(signaturesDir, { recursive: true });
    }
    
    // Save signature image
    const signatureFileName = `${signerId}_${Date.now()}.png`;
    const signatureFilePath = path.join(signaturesDir, signatureFileName);
    fs.writeFileSync(signatureFilePath, buffer);
    
    // Create signature record
    const signatureId = uuidv4();
    await db('signatures').insert({
      id: signatureId,
      signer_id: signerId,
      envelope_id: signer.envelope_id,
      org_id: signer.org_id,
      type,
      file_path: signatureFilePath,
      created_at: db.fn.now()
    });
    
    return signatureFilePath;
  } catch (error) {
    console.error('Error processing touch signature:', error);
    throw error;
  }
};

/**
 * Track mobile device info
 * @param {string} sessionId - Mobile signing session ID
 * @param {Object} deviceInfo - Device information
 * @returns {Promise<boolean>} - Success status
 */
const trackMobileDeviceInfo = async (sessionId, deviceInfo) => {
  try {
    // Get session
    const session = await db('mobile_signing_sessions')
      .where('id', sessionId)
      .first();
    
    if (!session) {
      throw new Error('Mobile signing session not found');
    }
    
    // Update session with device info
    await db('mobile_signing_sessions')
      .where('id', sessionId)
      .update({
        device_info: JSON.stringify(deviceInfo),
        updated_at: db.fn.now()
      });
    
    // Create device tracking record
    await db('device_tracking').insert({
      id: uuidv4(),
      session_id: sessionId,
      signer_id: session.signer_id,
      envelope_id: session.envelope_id,
      org_id: session.org_id,
      device_type: deviceInfo.type || 'unknown',
      device_os: deviceInfo.os || 'unknown',
      browser: deviceInfo.browser || 'unknown',
      screen_size: deviceInfo.screenSize || 'unknown',
      created_at: db.fn.now()
    });
    
    return true;
  } catch (error) {
    console.error('Error tracking mobile device info:', error);
    throw error;
  }
};

/**
 * Get mobile signing statistics
 * @param {string} orgId - Organization ID
 * @returns {Promise<Object>} - Mobile signing statistics
 */
const getMobileSigningStatistics = async (orgId) => {
  try {
    // Get total mobile sessions
    const totalSessions = await db('mobile_signing_sessions')
      .where('org_id', orgId)
      .count('id as count')
      .first();
    
    // Get device breakdown
    const deviceBreakdown = await db('device_tracking')
      .where('org_id', orgId)
      .select('device_type')
      .count('id as count')
      .groupBy('device_type');
    
    // Get OS breakdown
    const osBreakdown = await db('device_tracking')
      .where('org_id', orgId)
      .select('device_os')
      .count('id as count')
      .groupBy('device_os');
    
    // Get completion rate
    const completedSessions = await db.raw(`
      SELECT COUNT(DISTINCT mss.id) as count
      FROM mobile_signing_sessions mss
      JOIN signers s ON mss.signer_id = s.id
      WHERE mss.org_id = ? AND s.status = 'completed'
    `, [orgId]);
    
    const completionRate = totalSessions.count > 0 
      ? (completedSessions.rows[0].count / totalSessions.count) * 100 
      : 0;
    
    return {
      total_sessions: parseInt(totalSessions.count) || 0,
      device_breakdown: deviceBreakdown.reduce((acc, item) => {
        acc[item.device_type || 'unknown'] = parseInt(item.count);
        return acc;
      }, {}),
      os_breakdown: osBreakdown.reduce((acc, item) => {
        acc[item.device_os || 'unknown'] = parseInt(item.count);
        return acc;
      }, {}),
      completion_rate: parseFloat(completionRate.toFixed(2))
    };
  } catch (error) {
    console.error('Error getting mobile signing statistics:', error);
    throw error;
  }
};

module.exports = {
  generateMobileSigningUrl,
  validateMobileSigningToken,
  optimizeDocumentForMobile,
  sendMobileSigningNotification,
  processTouchSignature,
  trackMobileDeviceInfo,
  getMobileSigningStatistics
};
