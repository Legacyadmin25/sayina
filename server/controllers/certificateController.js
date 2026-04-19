/**
 * Certificate Controller
 * 
 * This controller handles digital certificate management for the Sayina E-Signature platform,
 * ensuring compliance with South African e-signature regulations (ECT Act).
 */

const { ApiError } = require('../middleware/errorMiddleware');
const { 
  generateUserCertificate,
  getUserCertificates,
  getCertificate,
  revokeCertificate,
  verifyCertificate,
  signWithCertificate,
  verifySignature,
  getOrganizationCertificates
} = require('../services/certificateService');
const { logSystemEvent } = require('../services/loggerService');
const { db } = require('../config/db');

/**
 * @desc    Generate a new digital certificate for a user
 * @route   POST /api/v1/certificates
 * @access  Private
 */
const createUserCertificate = async (req, res, next) => {
  try {
    const { subject, issuer } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Generate certificate
    const result = await generateUserCertificate(userId, orgId, {
      subject,
      issuer
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'certificate_generated',
      metadata: {
        certificate_id: result.certificate_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'Digital certificate generated successfully',
      data: {
        certificate_id: result.certificate_id,
        subject: result.subject,
        issuer: result.issuer,
        valid_from: result.valid_from,
        valid_to: result.valid_to
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user certificates
 * @route   GET /api/v1/certificates/user
 * @access  Private
 */
const getCurrentUserCertificates = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get certificates
    const certificates = await getUserCertificates(userId);
    
    res.status(200).json({
      success: true,
      count: certificates.length,
      data: certificates
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get certificate details
 * @route   GET /api/v1/certificates/:id
 * @access  Private
 */
const getCertificateDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;
    
    // Get certificate
    const certificate = await getCertificate(id);
    
    // Check if certificate belongs to organization
    if (certificate.user.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to view this certificate'));
    }
    
    res.status(200).json({
      success: true,
      data: certificate
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Revoke certificate
 * @route   POST /api/v1/certificates/:id/revoke
 * @access  Private
 */
const revokeCertificateById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Get certificate
    const certificate = await getCertificate(id);
    
    // Check if certificate belongs to organization
    if (certificate.user.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to revoke this certificate'));
    }
    
    // Validate reason
    if (!reason) {
      return next(new ApiError(400, 'Revocation reason is required'));
    }
    
    // Revoke certificate
    await revokeCertificate(id, reason);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'certificate_revoked',
      metadata: {
        certificate_id: id,
        reason
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Certificate revoked successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify certificate
 * @route   GET /api/v1/certificates/:id/verify
 * @access  Private
 */
const verifyCertificateById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Verify certificate
    const result = await verifyCertificate(id);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Sign data with certificate
 * @route   POST /api/v1/certificates/:id/sign
 * @access  Private
 */
const signData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Validate required fields
    if (!data) {
      return next(new ApiError(400, 'Data to sign is required'));
    }
    
    // Get certificate
    const certificate = await getCertificate(id);
    
    // Check if certificate belongs to user
    if (certificate.user.id !== userId) {
      return next(new ApiError(403, 'You can only sign with your own certificates'));
    }
    
    // Sign data
    const result = await signWithCertificate(id, data);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'data_signed',
      metadata: {
        certificate_id: id,
        signature_id: result.signature_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Data signed successfully',
      data: {
        signature_id: result.signature_id,
        certificate_id: result.certificate_id,
        signature: result.signature
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify signature
 * @route   POST /api/v1/certificates/verify-signature
 * @access  Private
 */
const verifyDataSignature = async (req, res, next) => {
  try {
    const { certificate_id, data, signature } = req.body;
    
    // Validate required fields
    if (!certificate_id || !data || !signature) {
      return next(new ApiError(400, 'Certificate ID, data, and signature are required'));
    }
    
    // Verify signature
    const result = await verifySignature(certificate_id, data, signature);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get organization certificates
 * @route   GET /api/v1/certificates/organization
 * @access  Private
 */
const getOrgCertificates = async (req, res, next) => {
  try {
    const { 
      status,
      limit = 20, 
      offset = 0 
    } = req.query;
    
    const orgId = req.user.org_id;
    
    // Get certificates
    const certificates = await getOrganizationCertificates(orgId, {
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.status(200).json({
      success: true,
      count: certificates.length,
      data: certificates
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createUserCertificate,
  getCurrentUserCertificates,
  getCertificateDetails,
  revokeCertificateById,
  verifyCertificateById,
  signData,
  verifyDataSignature,
  getOrgCertificates
};
