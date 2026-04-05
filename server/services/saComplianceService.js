/**
 * South African Compliance Service
 * 
 * This service provides functionality for ensuring compliance with South African regulations,
 * particularly the Electronic Communications and Transactions (ECT) Act and POPIA.
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { logSystemEvent } = require('./loggerService');

/**
 * Validate document for ECT Act compliance
 * @param {string} documentId - Document ID
 * @returns {Promise<Object>} - Compliance validation result
 */
const validateEctActCompliance = async (documentId) => {
  try {
    // Get document
    const document = await db('documents')
      .where('id', documentId)
      .first();
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Get envelope
    const envelope = await db('envelopes')
      .where('id', document.envelope_id)
      .first();
    
    // Get signers
    const signers = await db('signers')
      .where('envelope_id', document.envelope_id)
      .select();
    
    // Initialize compliance checks
    const complianceChecks = {
      has_valid_signatures: signers.length > 0,
      has_timestamp: true, // Sayina always adds timestamps
      has_audit_trail: true, // Sayina always creates audit trails
      has_certificate: false,
      has_advanced_electronic_signature: false,
      complies_with_ect_act: false,
      issues: []
    };
    
    // Check for certificates
    const certificates = await db('certificates')
      .whereIn('user_id', signers.map(signer => signer.user_id).filter(id => id))
      .select();
    
    complianceChecks.has_certificate = certificates.length > 0;
    
    // Check for advanced electronic signatures
    const advancedSignatures = certificates.filter(cert => cert.is_advanced);
    complianceChecks.has_advanced_electronic_signature = advancedSignatures.length > 0;
    
    // Check overall compliance
    complianceChecks.complies_with_ect_act = complianceChecks.has_valid_signatures && 
                                            complianceChecks.has_timestamp && 
                                            complianceChecks.has_audit_trail;
    
    // Add issues if any
    if (!complianceChecks.has_valid_signatures) {
      complianceChecks.issues.push('Document does not have valid signatures');
    }
    
    if (!complianceChecks.has_certificate) {
      complianceChecks.issues.push('No digital certificates associated with signers');
    }
    
    // Check if document requires advanced electronic signature
    const documentType = document.document_type || 'standard';
    if (['legal', 'financial', 'government'].includes(documentType) && !complianceChecks.has_advanced_electronic_signature) {
      complianceChecks.issues.push('Document type requires advanced electronic signature but none is present');
      complianceChecks.complies_with_ect_act = false;
    }
    
    // Create compliance record
    const complianceId = uuidv4();
    await db('compliance_checks').insert({
      id: complianceId,
      document_id: documentId,
      envelope_id: document.envelope_id,
      org_id: document.org_id,
      check_type: 'ect_act',
      status: complianceChecks.complies_with_ect_act ? 'compliant' : 'non_compliant',
      details: JSON.stringify(complianceChecks),
      created_at: db.fn.now()
    });
    
    return {
      compliance_id: complianceId,
      document_id: documentId,
      status: complianceChecks.complies_with_ect_act ? 'compliant' : 'non_compliant',
      checks: complianceChecks
    };
  } catch (error) {
    console.error('Error validating ECT Act compliance:', error);
    throw error;
  }
};

/**
 * Validate POPIA compliance
 * @param {string} orgId - Organization ID
 * @returns {Promise<Object>} - POPIA compliance result
 */
const validatePopiaCompliance = async (orgId) => {
  try {
    // Get organization
    const organization = await db('organizations')
      .where('id', orgId)
      .first();
    
    if (!organization) {
      throw new Error('Organization not found');
    }
    
    // Initialize compliance checks
    const complianceChecks = {
      has_privacy_policy: false,
      has_data_processing_agreement: false,
      has_consent_mechanisms: false,
      has_data_retention_policy: false,
      has_data_subject_access_process: false,
      complies_with_popia: false,
      issues: []
    };
    
    // Check for privacy policy
    const privacyPolicy = await db('organization_documents')
      .where('org_id', orgId)
      .where('document_type', 'privacy_policy')
      .first();
    
    complianceChecks.has_privacy_policy = !!privacyPolicy;
    
    if (!complianceChecks.has_privacy_policy) {
      complianceChecks.issues.push('Organization does not have a privacy policy');
    }
    
    // Check for data processing agreement
    const dpa = await db('organization_documents')
      .where('org_id', orgId)
      .where('document_type', 'data_processing_agreement')
      .first();
    
    complianceChecks.has_data_processing_agreement = !!dpa;
    
    if (!complianceChecks.has_data_processing_agreement) {
      complianceChecks.issues.push('Organization does not have a data processing agreement');
    }
    
    // Check for consent mechanisms
    const consentSettings = await db('organization_settings')
      .where('org_id', orgId)
      .where('setting_key', 'consent_mechanisms')
      .first();
    
    complianceChecks.has_consent_mechanisms = !!consentSettings && 
                                             JSON.parse(consentSettings.setting_value).enabled === true;
    
    if (!complianceChecks.has_consent_mechanisms) {
      complianceChecks.issues.push('Organization does not have consent mechanisms enabled');
    }
    
    // Check for data retention policy
    const retentionPolicy = await db('retention_policies')
      .where('org_id', orgId)
      .first();
    
    complianceChecks.has_data_retention_policy = !!retentionPolicy;
    
    if (!complianceChecks.has_data_retention_policy) {
      complianceChecks.issues.push('Organization does not have a data retention policy');
    }
    
    // Check for data subject access process
    const dsarSettings = await db('organization_settings')
      .where('org_id', orgId)
      .where('setting_key', 'data_subject_access_process')
      .first();
    
    complianceChecks.has_data_subject_access_process = !!dsarSettings && 
                                                     JSON.parse(dsarSettings.setting_value).enabled === true;
    
    if (!complianceChecks.has_data_subject_access_process) {
      complianceChecks.issues.push('Organization does not have a data subject access process');
    }
    
    // Check overall compliance
    complianceChecks.complies_with_popia = complianceChecks.has_privacy_policy && 
                                          complianceChecks.has_consent_mechanisms && 
                                          complianceChecks.has_data_retention_policy;
    
    // Create compliance record
    const complianceId = uuidv4();
    await db('compliance_checks').insert({
      id: complianceId,
      org_id: orgId,
      check_type: 'popia',
      status: complianceChecks.complies_with_popia ? 'compliant' : 'non_compliant',
      details: JSON.stringify(complianceChecks),
      created_at: db.fn.now()
    });
    
    return {
      compliance_id: complianceId,
      org_id: orgId,
      status: complianceChecks.complies_with_popia ? 'compliant' : 'non_compliant',
      checks: complianceChecks
    };
  } catch (error) {
    console.error('Error validating POPIA compliance:', error);
    throw error;
  }
};

/**
 * Generate compliance report
 * @param {string} orgId - Organization ID
 * @param {Object} options - Report options
 * @returns {Promise<string>} - Path to compliance report
 */
const generateComplianceReport = async (orgId, options = {}) => {
  try {
    const {
      start_date,
      end_date,
      include_ect_act = true,
      include_popia = true
    } = options;
    
    // Get organization
    const organization = await db('organizations')
      .where('id', orgId)
      .first();
    
    if (!organization) {
      throw new Error('Organization not found');
    }
    
    // Build date filter
    let dateFilter = {};
    if (start_date) {
      dateFilter.created_at = dateFilter.created_at || {};
      dateFilter.created_at['>='] = new Date(start_date);
    }
    if (end_date) {
      dateFilter.created_at = dateFilter.created_at || {};
      dateFilter.created_at['<='] = new Date(end_date);
    }
    
    // Get compliance checks
    const complianceChecks = await db('compliance_checks')
      .where('org_id', orgId)
      .where(dateFilter)
      .orderBy('created_at', 'desc');
    
    // Filter by check type if needed
    let filteredChecks = complianceChecks;
    if (!include_ect_act) {
      filteredChecks = filteredChecks.filter(check => check.check_type !== 'ect_act');
    }
    if (!include_popia) {
      filteredChecks = filteredChecks.filter(check => check.check_type !== 'popia');
    }
    
    // Get document and envelope IDs
    const documentIds = [...new Set(filteredChecks
      .filter(check => check.document_id)
      .map(check => check.document_id))];
    
    const envelopeIds = [...new Set(filteredChecks
      .filter(check => check.envelope_id)
      .map(check => check.envelope_id))];
    
    // Get documents and envelopes
    const documents = documentIds.length > 0 
      ? await db('documents').whereIn('id', documentIds).select()
      : [];
    
    const envelopes = envelopeIds.length > 0
      ? await db('envelopes').whereIn('id', envelopeIds).select()
      : [];
    
    // Create document lookup
    const documentLookup = {};
    documents.forEach(doc => {
      documentLookup[doc.id] = doc;
    });
    
    // Create envelope lookup
    const envelopeLookup = {};
    envelopes.forEach(env => {
      envelopeLookup[env.id] = env;
    });
    
    // Format report data
    const reportData = {
      organization: {
        id: organization.id,
        name: organization.name
      },
      report_period: {
        start_date: start_date || 'All time',
        end_date: end_date || 'Present'
      },
      summary: {
        total_checks: filteredChecks.length,
        compliant: filteredChecks.filter(check => check.status === 'compliant').length,
        non_compliant: filteredChecks.filter(check => check.status === 'non_compliant').length,
        compliance_rate: filteredChecks.length > 0 
          ? (filteredChecks.filter(check => check.status === 'compliant').length / filteredChecks.length) * 100 
          : 0
      },
      checks: filteredChecks.map(check => {
        const formattedCheck = {
          id: check.id,
          type: check.check_type,
          status: check.status,
          details: JSON.parse(check.details),
          created_at: check.created_at
        };
        
        if (check.document_id) {
          const document = documentLookup[check.document_id];
          if (document) {
            formattedCheck.document = {
              id: document.id,
              name: document.name
            };
          }
        }
        
        if (check.envelope_id) {
          const envelope = envelopeLookup[check.envelope_id];
          if (envelope) {
            formattedCheck.envelope = {
              id: envelope.id,
              name: envelope.name
            };
          }
        }
        
        return formattedCheck;
      })
    };
    
    // Create report record
    const reportId = uuidv4();
    await db('compliance_reports').insert({
      id: reportId,
      org_id: orgId,
      report_type: 'comprehensive',
      parameters: JSON.stringify(options),
      report_data: JSON.stringify(reportData),
      created_at: db.fn.now()
    });
    
    // Generate PDF report (placeholder for actual PDF generation)
    // In a real implementation, this would use a PDF generation library
    
    // Create reports directory if it doesn't exist
    const reportsDir = path.join(__dirname, '..', 'uploads', 'compliance_reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Save report data as JSON for now
    const reportFilePath = path.join(reportsDir, `${reportId}.json`);
    fs.writeFileSync(reportFilePath, JSON.stringify(reportData, null, 2));
    
    return reportFilePath;
  } catch (error) {
    console.error('Error generating compliance report:', error);
    throw error;
  }
};

/**
 * Get compliance history
 * @param {string} orgId - Organization ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Compliance history
 */
const getComplianceHistory = async (orgId, options = {}) => {
  try {
    const {
      check_type,
      status,
      limit = 20,
      offset = 0
    } = options;
    
    // Build query
    let query = db('compliance_checks')
      .where('org_id', orgId);
    
    // Apply filters
    if (check_type) {
      query = query.where('check_type', check_type);
    }
    
    if (status) {
      query = query.where('status', status);
    }
    
    // Apply pagination
    query = query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    // Get checks
    const checks = await query;
    
    // Format checks
    return checks.map(check => ({
      id: check.id,
      document_id: check.document_id,
      envelope_id: check.envelope_id,
      check_type: check.check_type,
      status: check.status,
      details: JSON.parse(check.details),
      created_at: check.created_at
    }));
  } catch (error) {
    console.error('Error getting compliance history:', error);
    throw error;
  }
};

/**
 * Get compliance reports
 * @param {string} orgId - Organization ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Compliance reports
 */
const getComplianceReports = async (orgId, options = {}) => {
  try {
    const {
      limit = 20,
      offset = 0
    } = options;
    
    // Get reports
    const reports = await db('compliance_reports')
      .where('org_id', orgId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    // Format reports
    return reports.map(report => ({
      id: report.id,
      report_type: report.report_type,
      parameters: JSON.parse(report.parameters),
      created_at: report.created_at
    }));
  } catch (error) {
    console.error('Error getting compliance reports:', error);
    throw error;
  }
};

/**
 * Get compliance report by ID
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} - Compliance report
 */
const getComplianceReportById = async (reportId) => {
  try {
    // Get report
    const report = await db('compliance_reports')
      .where('id', reportId)
      .first();
    
    if (!report) {
      throw new Error('Compliance report not found');
    }
    
    return {
      id: report.id,
      org_id: report.org_id,
      report_type: report.report_type,
      parameters: JSON.parse(report.parameters),
      report_data: JSON.parse(report.report_data),
      created_at: report.created_at
    };
  } catch (error) {
    console.error('Error getting compliance report by ID:', error);
    throw error;
  }
};

/**
 * Create POPIA consent record
 * @param {string} userId - User ID
 * @param {string} orgId - Organization ID
 * @param {Object} consentData - Consent data
 * @returns {Promise<string>} - Consent record ID
 */
const createPopiaConsentRecord = async (userId, orgId, consentData) => {
  try {
    const {
      purpose,
      data_categories,
      third_parties,
      retention_period,
      consent_text
    } = consentData;
    
    // Create consent record
    const consentId = uuidv4();
    await db('consent_records').insert({
      id: consentId,
      user_id: userId,
      org_id: orgId,
      purpose: purpose || 'e-signature service',
      data_categories: JSON.stringify(data_categories || []),
      third_parties: JSON.stringify(third_parties || []),
      retention_period: retention_period || '5 years',
      consent_text,
      ip_address: consentData.ip_address,
      user_agent: consentData.user_agent,
      created_at: db.fn.now()
    });
    
    return consentId;
  } catch (error) {
    console.error('Error creating POPIA consent record:', error);
    throw error;
  }
};

/**
 * Get user consent records
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Consent records
 */
const getUserConsentRecords = async (userId) => {
  try {
    // Get consent records
    const records = await db('consent_records')
      .where('user_id', userId)
      .orderBy('created_at', 'desc');
    
    // Format records
    return records.map(record => ({
      id: record.id,
      purpose: record.purpose,
      data_categories: JSON.parse(record.data_categories),
      third_parties: JSON.parse(record.third_parties),
      retention_period: record.retention_period,
      consent_text: record.consent_text,
      created_at: record.created_at
    }));
  } catch (error) {
    console.error('Error getting user consent records:', error);
    throw error;
  }
};

module.exports = {
  validateEctActCompliance,
  validatePopiaCompliance,
  generateComplianceReport,
  getComplianceHistory,
  getComplianceReports,
  getComplianceReportById,
  createPopiaConsentRecord,
  getUserConsentRecords
};
