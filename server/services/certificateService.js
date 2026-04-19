/**
 * Certificate Service
 * 
 * This service provides functionality for managing digital certificates
 * used for signing documents in the Sayina E-Signature platform.
 * It ensures compliance with South African e-signature regulations (ECT Act).
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { db } = require('../config/db');
const { logSystemEvent } = require('./loggerService');

/**
 * Generate a new digital certificate for a user
 * @param {string} userId - User ID
 * @param {string} orgId - Organization ID
 * @param {Object} options - Certificate options
 * @returns {Promise<Object>} - Certificate details
 */
const generateUserCertificate = async (userId, orgId, options = {}) => {
  try {
    // Get user details
    const user = await db('users')
      .where('id', userId)
      .first();
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Generate key pair
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
    
    // Create certificate directory if it doesn't exist
    const certDir = path.join(__dirname, '..', 'certificates');
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }
    
    // Generate certificate ID
    const certificateId = uuidv4();
    
    // Save private key
    const privateKeyPath = path.join(certDir, `${certificateId}_private.pem`);
    fs.writeFileSync(privateKeyPath, privateKey);
    
    // Save public key
    const publicKeyPath = path.join(certDir, `${certificateId}_public.pem`);
    fs.writeFileSync(publicKeyPath, publicKey);
    
    // Create certificate record
    const [certId] = await db('digital_certificates').insert({
      id: certificateId,
      user_id: userId,
      org_id: orgId,
      subject: options.subject || `CN=${user.first_name} ${user.last_name}, E=${user.email}`,
      issuer: options.issuer || 'Sayina E-Signature Service',
      valid_from: db.fn.now(),
      valid_to: db.raw(`now() + interval '1 year'`),
      public_key_path: publicKeyPath,
      private_key_path: privateKeyPath,
      status: 'active',
      created_at: db.fn.now()
    }).returning('id');
    
    return {
      certificate_id: certificateId,
      user_id: userId,
      subject: options.subject || `CN=${user.first_name} ${user.last_name}, E=${user.email}`,
      issuer: options.issuer || 'Sayina E-Signature Service',
      valid_from: new Date(),
      valid_to: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    };
  } catch (error) {
    console.error('Error generating user certificate:', error);
    throw error;
  }
};

/**
 * Get user certificates
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - User certificates
 */
const getUserCertificates = async (userId) => {
  try {
    // Get certificates
    const certificates = await db('digital_certificates')
      .where('user_id', userId)
      .orderBy('created_at', 'desc');
    
    // Format certificates
    return certificates.map(cert => ({
      id: cert.id,
      subject: cert.subject,
      issuer: cert.issuer,
      valid_from: cert.valid_from,
      valid_to: cert.valid_to,
      status: cert.status,
      created_at: cert.created_at
    }));
  } catch (error) {
    console.error('Error getting user certificates:', error);
    throw error;
  }
};

/**
 * Get certificate by ID
 * @param {string} certificateId - Certificate ID
 * @returns {Promise<Object>} - Certificate details
 */
const getCertificate = async (certificateId) => {
  try {
    // Get certificate
    const certificate = await db('digital_certificates')
      .where('id', certificateId)
      .first();
    
    if (!certificate) {
      throw new Error('Certificate not found');
    }
    
    // Get user details
    const user = await db('users')
      .where('id', certificate.user_id)
      .select('id', 'first_name', 'last_name', 'email')
      .first();
    
    return {
      id: certificate.id,
      user: user,
      subject: certificate.subject,
      issuer: certificate.issuer,
      valid_from: certificate.valid_from,
      valid_to: certificate.valid_to,
      status: certificate.status,
      created_at: certificate.created_at
    };
  } catch (error) {
    console.error('Error getting certificate:', error);
    throw error;
  }
};

/**
 * Revoke certificate
 * @param {string} certificateId - Certificate ID
 * @param {string} reason - Revocation reason
 * @returns {Promise<boolean>} - Success status
 */
const revokeCertificate = async (certificateId, reason) => {
  try {
    // Get certificate
    const certificate = await db('digital_certificates')
      .where('id', certificateId)
      .first();
    
    if (!certificate) {
      throw new Error('Certificate not found');
    }
    
    // Update certificate status
    await db('digital_certificates')
      .where('id', certificateId)
      .update({
        status: 'revoked',
        revocation_reason: reason,
        revoked_at: db.fn.now()
      });
    
    return true;
  } catch (error) {
    console.error('Error revoking certificate:', error);
    throw error;
  }
};

/**
 * Verify certificate validity
 * @param {string} certificateId - Certificate ID
 * @returns {Promise<Object>} - Verification result
 */
const verifyCertificate = async (certificateId) => {
  try {
    // Get certificate
    const certificate = await db('digital_certificates')
      .where('id', certificateId)
      .first();
    
    if (!certificate) {
      return {
        valid: false,
        reason: 'Certificate not found'
      };
    }
    
    // Check if certificate is active
    if (certificate.status !== 'active') {
      return {
        valid: false,
        reason: `Certificate is ${certificate.status}`,
        revocation_reason: certificate.revocation_reason,
        revoked_at: certificate.revoked_at
      };
    }
    
    // Check if certificate is expired
    const now = new Date();
    const validTo = new Date(certificate.valid_to);
    
    if (now > validTo) {
      return {
        valid: false,
        reason: 'Certificate is expired',
        expired_at: validTo
      };
    }
    
    return {
      valid: true,
      certificate: {
        id: certificate.id,
        subject: certificate.subject,
        issuer: certificate.issuer,
        valid_from: certificate.valid_from,
        valid_to: certificate.valid_to
      }
    };
  } catch (error) {
    console.error('Error verifying certificate:', error);
    throw error;
  }
};

/**
 * Sign data with certificate
 * @param {string} certificateId - Certificate ID
 * @param {string} data - Data to sign
 * @returns {Promise<Object>} - Signature details
 */
const signWithCertificate = async (certificateId, data) => {
  try {
    // Get certificate
    const certificate = await db('digital_certificates')
      .where('id', certificateId)
      .first();
    
    if (!certificate) {
      throw new Error('Certificate not found');
    }
    
    // Check if certificate is active
    if (certificate.status !== 'active') {
      throw new Error(`Certificate is ${certificate.status}`);
    }
    
    // Check if certificate is expired
    const now = new Date();
    const validTo = new Date(certificate.valid_to);
    
    if (now > validTo) {
      throw new Error('Certificate is expired');
    }
    
    // Read private key
    const privateKey = fs.readFileSync(certificate.private_key_path, 'utf8');
    
    // Create signature
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();
    
    const signature = sign.sign(privateKey, 'base64');
    
    // Create signature record
    const signatureId = uuidv4();
    await db('digital_signatures').insert({
      id: signatureId,
      certificate_id: certificateId,
      data_hash: crypto.createHash('sha256').update(data).digest('hex'),
      signature,
      created_at: db.fn.now()
    });
    
    return {
      signature_id: signatureId,
      certificate_id: certificateId,
      signature
    };
  } catch (error) {
    console.error('Error signing with certificate:', error);
    throw error;
  }
};

/**
 * Verify signature
 * @param {string} certificateId - Certificate ID
 * @param {string} data - Original data
 * @param {string} signature - Signature to verify
 * @returns {Promise<Object>} - Verification result
 */
const verifySignature = async (certificateId, data, signature) => {
  try {
    // Get certificate
    const certificate = await db('digital_certificates')
      .where('id', certificateId)
      .first();
    
    if (!certificate) {
      return {
        valid: false,
        reason: 'Certificate not found'
      };
    }
    
    // Read public key
    const publicKey = fs.readFileSync(certificate.public_key_path, 'utf8');
    
    // Verify signature
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    verify.end();
    
    const isValid = verify.verify(publicKey, signature, 'base64');
    
    if (!isValid) {
      return {
        valid: false,
        reason: 'Invalid signature'
      };
    }
    
    // Check certificate validity
    const certVerification = await verifyCertificate(certificateId);
    
    if (!certVerification.valid) {
      return {
        valid: false,
        reason: certVerification.reason,
        certificate_status: certVerification
      };
    }
    
    return {
      valid: true,
      certificate: {
        id: certificate.id,
        subject: certificate.subject,
        issuer: certificate.issuer
      }
    };
  } catch (error) {
    console.error('Error verifying signature:', error);
    throw error;
  }
};

/**
 * Get organization certificates
 * @param {string} orgId - Organization ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Organization certificates
 */
const getOrganizationCertificates = async (orgId, options = {}) => {
  try {
    // Build query
    let query = db('digital_certificates')
      .where('org_id', orgId)
      .orderBy('created_at', 'desc');
    
    // Apply filters
    if (options.status) {
      query = query.where('status', options.status);
    }
    
    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.offset(options.offset);
    }
    
    // Get certificates
    const certificates = await query;
    
    // Get user details
    const userIds = [...new Set(certificates.map(cert => cert.user_id))];
    const users = await db('users')
      .whereIn('id', userIds)
      .select('id', 'first_name', 'last_name', 'email');
    
    // Create user lookup
    const userLookup = {};
    users.forEach(user => {
      userLookup[user.id] = user;
    });
    
    // Format certificates
    return certificates.map(cert => ({
      id: cert.id,
      user: userLookup[cert.user_id],
      subject: cert.subject,
      issuer: cert.issuer,
      valid_from: cert.valid_from,
      valid_to: cert.valid_to,
      status: cert.status,
      created_at: cert.created_at,
      revoked_at: cert.revoked_at,
      revocation_reason: cert.revocation_reason
    }));
  } catch (error) {
    console.error('Error getting organization certificates:', error);
    throw error;
  }
};

module.exports = {
  generateUserCertificate,
  getUserCertificates,
  getCertificate,
  revokeCertificate,
  verifyCertificate,
  signWithCertificate,
  verifySignature,
  getOrganizationCertificates
};
