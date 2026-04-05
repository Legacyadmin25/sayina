/**
 * Compliance Helper for South African E-Signature Regulations
 * 
 * This utility provides functions to ensure compliance with South African
 * electronic signature regulations, particularly the Electronic Communications
 * and Transactions Act 25 of 2002 (ECT Act).
 */

const { ApiError } = require('../middleware/errorMiddleware');
const db = require('../config/db');

/**
 * Validate that a document meets compliance requirements
 * @param {Object} documentData - Document data
 * @returns {Promise<Object>} - Validation result
 */
const validateDocumentCompliance = async (documentData) => {
  try {
    const {
      document_type,
      requires_advanced_signature = false,
      metadata = {}
    } = documentData;

    // Check if document type requires advanced electronic signature
    // According to ECT Act Section 13(1) and 13(2)
    const advancedSignatureRequired = await requiresAdvancedSignature(document_type);

    // If document requires advanced signature but it's not specified
    if (advancedSignatureRequired && !requires_advanced_signature) {
      return {
        compliant: false,
        message: 'This document type requires an advanced electronic signature as per ECT Act Section 13(2)',
        requirements: {
          advanced_signature: true,
          reason: 'Document type legally requires advanced signature'
        }
      };
    }

    return {
      compliant: true,
      message: 'Document meets compliance requirements',
      requirements: {
        advanced_signature: requires_advanced_signature || advancedSignatureRequired
      }
    };
  } catch (error) {
    console.error('Error validating document compliance:', error);
    throw new ApiError(500, 'Failed to validate document compliance');
  }
};

/**
 * Check if a document type requires advanced electronic signature
 * @param {string} documentType - Document type
 * @returns {Promise<boolean>} - True if advanced signature is required
 */
const requiresAdvancedSignature = async (documentType) => {
  // List of document types that require advanced electronic signatures
  // as per South African law (ECT Act and other regulations)
  const advancedSignatureTypes = [
    'property_transfer',
    'long_term_lease',
    'bill_of_exchange',
    'will',
    'testament',
    'codicil',
    'alienation_of_land'
  ];

  return advancedSignatureTypes.includes(documentType);
};

/**
 * Generate compliance disclosure text for signing page
 * @param {Object} options - Options for disclosure text
 * @returns {string} - Disclosure text
 */
const generateComplianceDisclosure = (options = {}) => {
  const {
    requiresAdvancedSignature = false,
    includeConsent = true,
    includePrivacy = true,
    condensed = false
  } = options;

  // If condensed is true, return a shorter version for the consent UI
  if (condensed) {
    return `By signing, I acknowledge that this electronic signature is legally binding under the Electronic Communications and Transactions Act 25 of 2002 (ECT Act) and I consent to the electronic record-keeping of my personal information in accordance with the Protection of Personal Information Act (POPIA).`;
  }

  let disclosure = `
By signing this document electronically, I acknowledge and agree that:

1. My electronic signature is the legal equivalent of my manual signature on this document, in accordance with the Electronic Communications and Transactions Act 25 of 2002 (ECT Act).

2. I consent to be legally bound by the terms and conditions of this document.

3. I consent to conduct business electronically with respect to this transaction.
`;

  // Add advanced signature disclosure if required
  if (requiresAdvancedSignature) {
    disclosure += `
4. This document requires an advanced electronic signature as defined in Section 13(2) of the ECT Act, which has been accredited by the South African Accreditation Authority.
`;
  }

  // Add consent disclosure if requested
  if (includeConsent) {
    disclosure += `
${requiresAdvancedSignature ? '5' : '4'}. I understand that I have the right to withdraw my consent to sign electronically, but that doing so may impact my ability to complete this transaction electronically.
`;
  }

  // Add privacy disclosure if requested
  if (includePrivacy) {
    disclosure += `
${requiresAdvancedSignature ? (includeConsent ? '6' : '5') : (includeConsent ? '5' : '4')}. I understand that my signing events will be recorded for compliance and evidentiary purposes, including my IP address, timestamp, and other relevant metadata in accordance with the Protection of Personal Information Act (POPIA).
`;
  }

  return disclosure.trim();
};

/**
 * Generate legal disclaimer for completed documents
 * @param {Object} options - Options for disclaimer
 * @returns {string} - Legal disclaimer
 */
const generateLegalDisclaimer = (options = {}) => {
  const {
    organizationName = 'Sayina',
    includeAdvancedSignature = false
  } = options;

  let disclaimer = `
LEGAL DISCLAIMER

This document has been electronically signed in accordance with the Electronic Communications and Transactions Act 25 of 2002 (ECT Act) of South Africa.

The electronic signatures contained in this document are legally binding as per Section 13 of the ECT Act, which recognizes electronic signatures as valid and enforceable.
`;

  // Add advanced signature disclaimer if applicable
  if (includeAdvancedSignature) {
    disclaimer += `
This document contains advanced electronic signatures as defined in Section 13(2) of the ECT Act, which have been accredited by the South African Accreditation Authority.
`;
  }

  disclaimer += `
${organizationName} maintains secure and tamper-evident records of all signature events, and the audit trail serves as proof of those events.

The authenticity of this document can be verified through the audit trail certificate attached to this document.
`;

  return disclaimer.trim();
};

/**
 * Record compliance verification for an envelope
 * @param {string} envelopeId - Envelope ID
 * @param {Object} verificationData - Verification data
 * @returns {Promise<string>} - Verification ID
 */
const recordComplianceVerification = async (envelopeId, verificationData) => {
  try {
    const {
      verification_type,
      verification_method,
      success,
      metadata = {}
    } = verificationData;

    // Create verification record
    const [verificationId] = await db('compliance_verifications').insert({
      envelope_id: envelopeId,
      verification_type,
      verification_method,
      success,
      metadata: JSON.stringify(metadata)
    }).returning('id');

    return verificationId;
  } catch (error) {
    console.error('Error recording compliance verification:', error);
    throw new ApiError(500, 'Failed to record compliance verification');
  }
};

/**
 * Validate signer identity verification requirements
 * @param {Object} signerData - Signer data
 * @returns {Object} - Verification requirements
 */
const validateSignerVerificationRequirements = (signerData) => {
  const {
    role,
    document_type,
    requires_advanced_signature = false
  } = signerData;

  // Default verification requirements
  let requirements = {
    requires_id_verification: false,
    requires_face_verification: false,
    requires_otp_verification: true,
    verification_methods: ['email']
  };

  // If document requires advanced signature, require stronger verification
  if (requires_advanced_signature) {
    requirements = {
      requires_id_verification: true,
      requires_face_verification: true,
      requires_otp_verification: true,
      verification_methods: ['email', 'sms', 'id_document']
    };
  }

  // If document type has specific requirements
  if (document_type === 'financial' || document_type === 'legal') {
    requirements.requires_id_verification = true;
    requirements.requires_otp_verification = true;
    
    if (!requirements.verification_methods.includes('sms')) {
      requirements.verification_methods.push('sms');
    }
  }

  // If signer role is approver, require stronger verification
  if (role === 'approver') {
    requirements.requires_otp_verification = true;
    
    if (!requirements.verification_methods.includes('sms')) {
      requirements.verification_methods.push('sms');
    }
  }

  return requirements;
};

/**
 * Generate POPIA compliance text for privacy policy
 * @returns {string} - POPIA compliance text
 */
const generatePOPIAComplianceText = () => {
  return `
PROTECTION OF PERSONAL INFORMATION ACT (POPIA) COMPLIANCE

In accordance with the Protection of Personal Information Act 4 of 2013 (POPIA), we are committed to protecting your personal information and ensuring that your privacy is respected.

1. Collection of Personal Information
   We collect personal information that is necessary for the electronic signing process, including but not limited to your name, email address, phone number, IP address, and signature data.

2. Purpose of Collection
   Your personal information is collected for the purpose of facilitating electronic signatures, verifying your identity, and maintaining a secure audit trail of the signing process.

3. Storage and Security
   We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, loss, or damage.

4. Retention Period
   Your personal information will be retained for as long as necessary to fulfill the purposes for which it was collected, or as required by law.

5. Your Rights
   You have the right to access, correct, or delete your personal information. You may also object to the processing of your personal information or request a restriction of processing.

6. Information Sharing
   We do not share your personal information with third parties except as necessary to provide our services or as required by law.

7. Contact Information
   For any queries regarding the processing of your personal information, please contact our Information Officer at [contact information].
`.trim();
};

/**
 * Check if an organization is compliant with regulations
 * @param {string} orgId - Organization ID
 * @returns {Promise<Object>} - Compliance status
 */
const checkOrganizationCompliance = async (orgId) => {
  try {
    // Get organization details
    const organization = await db('organizations')
      .where('id', orgId)
      .first();

    if (!organization) {
      throw new ApiError(404, 'Organization not found');
    }

    // Check if organization has required compliance documents
    const hasPrivacyPolicy = await db('compliance_documents')
      .where('org_id', orgId)
      .where('document_type', 'privacy_policy')
      .where('active', true)
      .first();

    const hasTermsOfService = await db('compliance_documents')
      .where('org_id', orgId)
      .where('document_type', 'terms_of_service')
      .where('active', true)
      .first();

    // Check if organization has designated information officer (POPIA requirement)
    const hasInformationOfficer = organization.information_officer_name && 
                                  organization.information_officer_email;

    return {
      compliant: hasPrivacyPolicy && hasTermsOfService && hasInformationOfficer,
      requirements: {
        privacy_policy: !!hasPrivacyPolicy,
        terms_of_service: !!hasTermsOfService,
        information_officer: !!hasInformationOfficer
      },
      missing: [
        ...(!hasPrivacyPolicy ? ['privacy_policy'] : []),
        ...(!hasTermsOfService ? ['terms_of_service'] : []),
        ...(!hasInformationOfficer ? ['information_officer'] : [])
      ]
    };
  } catch (error) {
    console.error('Error checking organization compliance:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to check organization compliance');
  }
};

/**
 * Validate compliance consent for signing
 * @param {Object} consentData - Consent data
 * @returns {Object} - Validation result
 */
const validateComplianceConsent = (consentData) => {
  try {
    const {
      complianceGiven,
      complianceAt,
      complianceVia = 'ECT Act 25/2002; POPIA consent'
    } = consentData;
    
    // Check if compliance consent was given
    if (!complianceGiven) {
      return {
        valid: false,
        message: 'Compliance consent is required before signing'
      };
    }
    
    // Check if compliance timestamp is provided and valid
    if (!complianceAt) {
      return {
        valid: false,
        message: 'Compliance consent timestamp is required'
      };
    }
    
    // Check if timestamp is in the past
    const complianceTimestamp = new Date(complianceAt);
    const now = new Date();
    
    if (isNaN(complianceTimestamp.getTime()) || complianceTimestamp > now) {
      return {
        valid: false,
        message: 'Invalid compliance consent timestamp'
      };
    }
    
    // Check if timestamp is not too old (max 1 hour)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    if (complianceTimestamp < oneHourAgo) {
      return {
        valid: false,
        message: 'Compliance consent has expired, please refresh and try again'
      };
    }
    
    return {
      valid: true,
      message: 'Compliance consent is valid',
      timestamp: complianceTimestamp,
      via: complianceVia
    };
  } catch (error) {
    console.error('Error validating compliance consent:', error);
    return {
      valid: false,
      message: 'Failed to validate compliance consent'
    };
  }
};

/**
 * Record compliance consent for a signer
 * @param {string} signerId - Signer ID
 * @param {Object} consentData - Consent data
 * @returns {Promise<boolean>} - Success indicator
 */
const recordComplianceConsent = async (signerId, consentData) => {
  try {
    const validation = validateComplianceConsent(consentData);
    
    if (!validation.valid) {
      throw new Error(validation.message);
    }
    
    // Update signer record with compliance information
    await db('signers')
      .where('id', signerId)
      .update({
        compliance_given: true,
        compliance_given_at: validation.timestamp,
        compliance_via: validation.via,
        compliance_metadata: JSON.stringify({
          ip_address: consentData.ipAddress,
          user_agent: consentData.userAgent,
          consent_type: 'electronic_signature',
          timestamp_utc: validation.timestamp.toISOString()
        }),
        updated_at: new Date()
      });
    
    return true;
  } catch (error) {
    console.error('Error recording compliance consent:', error);
    return false;
  }
};

/**
 * Check if organization's subscription plan requires watermark
 * @param {string} orgId - Organization ID
 * @returns {Promise<boolean>} - True if watermark is required
 */
const requiresWatermark = async (orgId) => {
  try {
    // Get organization's current subscription
    const subscription = await db('subscriptions')
      .where('org_id', orgId)
      .where('status', 'active')
      .orderBy('created_at', 'desc')
      .first();
    
    if (!subscription) {
      return true; // No active subscription, so watermark is required
    }
    
    // Get subscription plan details
    const plan = await db('subscription_plans')
      .where('id', subscription.plan_id)
      .first();
    
    if (!plan) {
      return true; // Plan not found, default to requiring watermark
    }
    
    // Check if plan is free tier
    return plan.name.toLowerCase().includes('free') || plan.price === 0;
  } catch (error) {
    console.error('Error checking if watermark is required:', error);
    return true; // Default to requiring watermark in case of error
  }
};

module.exports = {
  validateDocumentCompliance,
  requiresAdvancedSignature,
  generateComplianceDisclosure,
  generateLegalDisclaimer,
  recordComplianceVerification,
  validateSignerVerificationRequirements,
  generatePOPIAComplianceText,
  checkOrganizationCompliance,
  validateComplianceConsent,
  recordComplianceConsent,
  requiresWatermark
};
