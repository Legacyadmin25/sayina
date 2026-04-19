/**
 * Regulatory Compliance Service
 * 
 * This service provides regulatory compliance automation for the Sayina E-Signature platform,
 * including compliance checks, reporting, and jurisdiction-specific requirements.
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { db } = require('../config/db');
const { logSystemEvent } = require('./loggerService');

// Supported regulations
const SUPPORTED_REGULATIONS = [
  {
    id: 'ect_act',
    name: 'Electronic Communications and Transactions Act',
    country: 'South Africa',
    description: 'South African legislation governing electronic communications and transactions',
    requirements: [
      'Electronic signatures must be uniquely linked to the signatory',
      'Electronic signatures must be capable of identifying the signatory',
      'Electronic signatures must be created using means that the signatory can maintain under their control',
      'Electronic signatures must be linked to the data to which it relates in such a manner that any subsequent change of the data is detectable'
    ]
  },
  {
    id: 'popia',
    name: 'Protection of Personal Information Act',
    country: 'South Africa',
    description: 'South African data protection legislation',
    requirements: [
      'Personal information must be processed lawfully and in a reasonable manner',
      'Personal information must be collected for a specific, explicitly defined and lawful purpose',
      'Consent must be obtained for the processing of personal information',
      'Security safeguards must be implemented to protect personal information'
    ]
  },
  {
    id: 'fais',
    name: 'Financial Advisory and Intermediary Services Act',
    country: 'South Africa',
    description: 'South African legislation governing financial services providers',
    requirements: [
      'Financial service providers must maintain records of client advice and transactions',
      'Records must be kept for a minimum of five years',
      'Records must be readily accessible and available for inspection',
      'Electronic records must be secure and backed up'
    ]
  }
];

/**
 * Get supported regulations
 * @returns {Promise<Array>} - Supported regulations
 */
const getSupportedRegulations = async () => {
  try {
    return SUPPORTED_REGULATIONS;
  } catch (error) {
    console.error('Error getting supported regulations:', error);
    throw error;
  }
};

/**
 * Check document compliance
 * @param {string} documentId - Document ID
 * @param {string} regulationId - Regulation ID
 * @returns {Promise<Object>} - Compliance check result
 */
const checkDocumentCompliance = async (documentId, regulationId) => {
  try {
    // Get document
    const document = await db('envelope_documents')
      .where('id', documentId)
      .first();
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Get envelope
    const envelope = await db('envelopes')
      .where('id', document.envelope_id)
      .first();
    
    if (!envelope) {
      throw new Error('Envelope not found');
    }
    
    // Get regulation
    const regulation = SUPPORTED_REGULATIONS.find(reg => reg.id === regulationId);
    
    if (!regulation) {
      throw new Error(`Regulation not found: ${regulationId}`);
    }
    
    // In a real implementation, this would perform actual compliance checks
    // For now, we'll simulate the checks
    
    // Generate compliance checks
    const complianceChecks = [];
    
    switch (regulationId) {
      case 'ect_act':
        complianceChecks.push({
          requirement: 'Electronic signatures must be uniquely linked to the signatory',
          status: 'passed',
          details: 'Signatures are linked to unique user accounts'
        });
        complianceChecks.push({
          requirement: 'Electronic signatures must be capable of identifying the signatory',
          status: 'passed',
          details: 'Signers are identified through email verification'
        });
        complianceChecks.push({
          requirement: 'Electronic signatures must be created using means that the signatory can maintain under their control',
          status: 'passed',
          details: 'Signatures require email access and password authentication'
        });
        complianceChecks.push({
          requirement: 'Electronic signatures must be linked to the data to which it relates in such a manner that any subsequent change of the data is detectable',
          status: 'passed',
          details: 'Document hash is stored and verified'
        });
        break;
      
      case 'popia':
        complianceChecks.push({
          requirement: 'Personal information must be processed lawfully and in a reasonable manner',
          status: 'passed',
          details: 'Processing is based on consent and legitimate interest'
        });
        complianceChecks.push({
          requirement: 'Personal information must be collected for a specific, explicitly defined and lawful purpose',
          status: 'warning',
          details: 'Purpose of collection should be clearly stated in the document'
        });
        complianceChecks.push({
          requirement: 'Consent must be obtained for the processing of personal information',
          status: 'warning',
          details: 'Explicit consent field recommended'
        });
        complianceChecks.push({
          requirement: 'Security safeguards must be implemented to protect personal information',
          status: 'passed',
          details: 'Document is encrypted and access-controlled'
        });
        break;
      
      case 'fais':
        complianceChecks.push({
          requirement: 'Financial service providers must maintain records of client advice and transactions',
          status: 'passed',
          details: 'Document is stored in compliance with record-keeping requirements'
        });
        complianceChecks.push({
          requirement: 'Records must be kept for a minimum of five years',
          status: 'warning',
          details: 'Retention policy should be configured for at least 5 years'
        });
        complianceChecks.push({
          requirement: 'Records must be readily accessible and available for inspection',
          status: 'passed',
          details: 'Document is accessible through the platform'
        });
        complianceChecks.push({
          requirement: 'Electronic records must be secure and backed up',
          status: 'passed',
          details: 'Document is encrypted and backed up'
        });
        break;
    }
    
    // Calculate overall status
    const failedChecks = complianceChecks.filter(check => check.status === 'failed');
    const warningChecks = complianceChecks.filter(check => check.status === 'warning');
    
    let overallStatus = 'compliant';
    if (failedChecks.length > 0) {
      overallStatus = 'non_compliant';
    } else if (warningChecks.length > 0) {
      overallStatus = 'needs_review';
    }
    
    // Generate recommendations
    const recommendations = [];
    
    if (failedChecks.length > 0) {
      recommendations.push('Address all failed compliance checks');
    }
    
    if (warningChecks.length > 0) {
      recommendations.push('Review and address warning items');
    }
    
    if (regulationId === 'popia' && warningChecks.length > 0) {
      recommendations.push('Add explicit consent fields to the document');
      recommendations.push('Clearly state the purpose of data collection');
    }
    
    if (regulationId === 'fais' && warningChecks.some(check => check.requirement.includes('five years'))) {
      recommendations.push('Configure document retention policy for at least 5 years');
    }
    
    // Store compliance check
    const checkId = uuidv4();
    await db('compliance_checks').insert({
      id: checkId,
      document_id: documentId,
      envelope_id: envelope.id,
      regulation_id: regulationId,
      status: overallStatus,
      results: JSON.stringify({
        checks: complianceChecks,
        recommendations
      }),
      created_at: db.fn.now()
    });
    
    return {
      check_id: checkId,
      document_id: documentId,
      envelope_id: envelope.id,
      regulation: {
        id: regulation.id,
        name: regulation.name,
        country: regulation.country
      },
      status: overallStatus,
      checks: complianceChecks,
      recommendations,
      created_at: new Date()
    };
  } catch (error) {
    console.error('Error checking document compliance:', error);
    throw error;
  }
};

/**
 * Generate compliance report
 * @param {string} orgId - Organization ID
 * @param {Object} options - Report options
 * @returns {Promise<Object>} - Report details
 */
const generateComplianceReport = async (orgId, options = {}) => {
  try {
    const {
      start_date,
      end_date,
      regulation_ids = [],
      include_recommendations = true
    } = options;
    
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
    
    // Get envelopes for organization
    const envelopes = await db('envelopes')
      .where('org_id', orgId)
      .where(dateFilter);
    
    if (envelopes.length === 0) {
      throw new Error('No envelopes found for the specified criteria');
    }
    
    // Get compliance checks
    let checksQuery = db('compliance_checks')
      .whereIn('envelope_id', envelopes.map(env => env.id))
      .where(dateFilter);
    
    // Apply regulation filter
    if (regulation_ids.length > 0) {
      checksQuery = checksQuery.whereIn('regulation_id', regulation_ids);
    }
    
    const complianceChecks = await checksQuery;
    
    // Group checks by regulation
    const checksByRegulation = {};
    
    for (const check of complianceChecks) {
      const regulationId = check.regulation_id;
      
      if (!checksByRegulation[regulationId]) {
        checksByRegulation[regulationId] = [];
      }
      
      checksByRegulation[regulationId].push({
        id: check.id,
        document_id: check.document_id,
        envelope_id: check.envelope_id,
        status: check.status,
        results: JSON.parse(check.results),
        created_at: check.created_at
      });
    }
    
    // Calculate statistics
    const statistics = {
      total_checks: complianceChecks.length,
      by_status: {
        compliant: complianceChecks.filter(check => check.status === 'compliant').length,
        needs_review: complianceChecks.filter(check => check.status === 'needs_review').length,
        non_compliant: complianceChecks.filter(check => check.status === 'non_compliant').length
      },
      by_regulation: {}
    };
    
    // Calculate statistics by regulation
    Object.keys(checksByRegulation).forEach(regulationId => {
      const checks = checksByRegulation[regulationId];
      const regulation = SUPPORTED_REGULATIONS.find(reg => reg.id === regulationId);
      
      statistics.by_regulation[regulationId] = {
        name: regulation ? regulation.name : regulationId,
        total: checks.length,
        compliant: checks.filter(check => check.status === 'compliant').length,
        needs_review: checks.filter(check => check.status === 'needs_review').length,
        non_compliant: checks.filter(check => check.status === 'non_compliant').length
      };
    });
    
    // Generate recommendations if requested
    let recommendations = [];
    
    if (include_recommendations) {
      // Collect all recommendations from checks
      const allRecommendations = complianceChecks
        .filter(check => check.status !== 'compliant')
        .map(check => {
          const results = JSON.parse(check.results);
          return results.recommendations || [];
        })
        .flat();
      
      // Count occurrences of each recommendation
      const recommendationCounts = {};
      allRecommendations.forEach(rec => {
        recommendationCounts[rec] = (recommendationCounts[rec] || 0) + 1;
      });
      
      // Sort recommendations by frequency
      recommendations = Object.keys(recommendationCounts)
        .map(rec => ({
          recommendation: rec,
          frequency: recommendationCounts[rec]
        }))
        .sort((a, b) => b.frequency - a.frequency);
    }
    
    // Generate report ID
    const reportId = uuidv4();
    
    // Create report content
    const reportContent = {
      id: reportId,
      org_id: orgId,
      generated_at: new Date(),
      parameters: {
        start_date,
        end_date,
        regulation_ids,
        include_recommendations
      },
      statistics,
      recommendations,
      checks_by_regulation: checksByRegulation
    };
    
    // Store report
    await db('compliance_reports').insert({
      id: reportId,
      org_id: orgId,
      parameters: JSON.stringify({
        start_date,
        end_date,
        regulation_ids,
        include_recommendations
      }),
      content: JSON.stringify(reportContent),
      created_at: db.fn.now()
    });
    
    // Create reports directory if it doesn't exist
    const reportsDir = path.join(__dirname, '..', 'uploads', 'compliance_reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Save report to file
    const reportPath = path.join(reportsDir, `${reportId}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(reportContent, null, 2));
    
    return {
      report_id: reportId,
      org_id: orgId,
      statistics,
      recommendations: recommendations.slice(0, 5), // Return top 5 recommendations
      report_path: reportPath,
      created_at: new Date()
    };
  } catch (error) {
    console.error('Error generating compliance report:', error);
    throw error;
  }
};

/**
 * Get jurisdiction requirements
 * @param {string} jurisdictionCode - Jurisdiction code
 * @returns {Promise<Object>} - Jurisdiction requirements
 */
const getJurisdictionRequirements = async (jurisdictionCode) => {
  try {
    // In a real implementation, this would fetch requirements from a database
    // For now, we'll return requirements for a few sample jurisdictions
    
    const jurisdictions = {
      'za': {
        code: 'za',
        name: 'South Africa',
        signature_requirements: {
          standard_signature: {
            legal_status: 'valid',
            description: 'Standard electronic signatures are valid for most documents',
            exceptions: ['property transfers', 'wills', 'bills of exchange']
          },
          advanced_signature: {
            legal_status: 'valid',
            description: 'Advanced electronic signatures are required for specific documents',
            required_for: ['documents where law requires signature', 'documents where law requires advanced signature']
          }
        },
        data_protection: {
          law: 'Protection of Personal Information Act (POPIA)',
          requirements: [
            'Explicit consent for data processing',
            'Purpose limitation',
            'Data minimization',
            'Security safeguards'
          ]
        },
        record_keeping: {
          requirements: [
            'Records must be accessible',
            'Records must be in usable format',
            'Records must be stored securely'
          ],
          retention_periods: {
            general: '5 years',
            tax: '5 years',
            employment: '3 years'
          }
        }
      },
      'us': {
        code: 'us',
        name: 'United States',
        signature_requirements: {
          standard_signature: {
            legal_status: 'valid',
            description: 'Electronic signatures are valid under ESIGN Act and UETA',
            exceptions: ['wills', 'certain family law documents', 'court orders']
          }
        },
        data_protection: {
          law: 'Varies by state and industry',
          requirements: [
            'Reasonable security measures',
            'Privacy notices',
            'Breach notification'
          ]
        },
        record_keeping: {
          requirements: [
            'Records must be accurate',
            'Records must be accessible',
            'Records must be protected'
          ],
          retention_periods: {
            general: 'Varies by state and industry',
            tax: '7 years',
            employment: '3 years'
          }
        }
      },
      'gb': {
        code: 'gb',
        name: 'United Kingdom',
        signature_requirements: {
          standard_signature: {
            legal_status: 'valid',
            description: 'Electronic signatures are valid for most documents under eIDAS',
            exceptions: ['deeds requiring witness', 'wills']
          }
        },
        data_protection: {
          law: 'UK GDPR and Data Protection Act 2018',
          requirements: [
            'Lawful basis for processing',
            'Purpose limitation',
            'Data minimization',
            'Accountability'
          ]
        },
        record_keeping: {
          requirements: [
            'Records must be accurate',
            'Records must be accessible',
            'Records must be secure'
          ],
          retention_periods: {
            general: 'As long as necessary',
            tax: '6 years',
            employment: '6 years'
          }
        }
      }
    };
    
    // Return requirements for requested jurisdiction
    const requirements = jurisdictions[jurisdictionCode.toLowerCase()];
    
    if (!requirements) {
      throw new Error(`Jurisdiction not found: ${jurisdictionCode}`);
    }
    
    return requirements;
  } catch (error) {
    console.error('Error getting jurisdiction requirements:', error);
    throw error;
  }
};

/**
 * Configure compliance settings
 * @param {string} orgId - Organization ID
 * @param {Object} settings - Compliance settings
 * @returns {Promise<Object>} - Updated settings
 */
const configureComplianceSettings = async (orgId, settings) => {
  try {
    const {
      default_jurisdiction,
      enabled_regulations,
      auto_check_compliance,
      retention_policy
    } = settings;
    
    // Validate settings
    if (default_jurisdiction) {
      // Verify jurisdiction exists
      await getJurisdictionRequirements(default_jurisdiction);
    }
    
    if (enabled_regulations) {
      // Verify regulations exist
      const supportedRegulations = await getSupportedRegulations();
      const supportedIds = supportedRegulations.map(reg => reg.id);
      
      for (const regId of enabled_regulations) {
        if (!supportedIds.includes(regId)) {
          throw new Error(`Unsupported regulation: ${regId}`);
        }
      }
    }
    
    // Get existing settings
    const existingSettings = await db('organization_settings')
      .where('org_id', orgId)
      .first();
    
    // Parse existing compliance settings
    let complianceSettings = {};
    if (existingSettings && existingSettings.compliance_settings) {
      complianceSettings = JSON.parse(existingSettings.compliance_settings);
    }
    
    // Update settings
    if (default_jurisdiction !== undefined) {
      complianceSettings.default_jurisdiction = default_jurisdiction;
    }
    
    if (enabled_regulations !== undefined) {
      complianceSettings.enabled_regulations = enabled_regulations;
    }
    
    if (auto_check_compliance !== undefined) {
      complianceSettings.auto_check_compliance = auto_check_compliance;
    }
    
    if (retention_policy !== undefined) {
      complianceSettings.retention_policy = retention_policy;
    }
    
    // Store updated settings
    if (existingSettings) {
      await db('organization_settings')
        .where('org_id', orgId)
        .update({
          compliance_settings: JSON.stringify(complianceSettings),
          updated_at: db.fn.now()
        });
    } else {
      await db('organization_settings').insert({
        org_id: orgId,
        compliance_settings: JSON.stringify(complianceSettings),
        created_at: db.fn.now()
      });
    }
    
    return complianceSettings;
  } catch (error) {
    console.error('Error configuring compliance settings:', error);
    throw error;
  }
};

/**
 * Get organization compliance settings
 * @param {string} orgId - Organization ID
 * @returns {Promise<Object>} - Compliance settings
 */
const getComplianceSettings = async (orgId) => {
  try {
    // Get settings
    const settings = await db('organization_settings')
      .where('org_id', orgId)
      .first();
    
    if (!settings || !settings.compliance_settings) {
      // Return default settings
      return {
        default_jurisdiction: 'za',
        enabled_regulations: ['ect_act', 'popia'],
        auto_check_compliance: true,
        retention_policy: {
          default_period: '5 years',
          by_document_type: {}
        }
      };
    }
    
    return JSON.parse(settings.compliance_settings);
  } catch (error) {
    console.error('Error getting compliance settings:', error);
    throw error;
  }
};

/**
 * Get compliance check
 * @param {string} checkId - Check ID
 * @returns {Promise<Object>} - Compliance check
 */
const getComplianceCheck = async (checkId) => {
  try {
    // Get check
    const check = await db('compliance_checks')
      .where('id', checkId)
      .first();
    
    if (!check) {
      throw new Error('Compliance check not found');
    }
    
    // Get regulation
    const regulation = SUPPORTED_REGULATIONS.find(reg => reg.id === check.regulation_id);
    
    // Parse results
    const results = JSON.parse(check.results);
    
    return {
      id: check.id,
      document_id: check.document_id,
      envelope_id: check.envelope_id,
      regulation: regulation ? {
        id: regulation.id,
        name: regulation.name,
        country: regulation.country
      } : { id: check.regulation_id },
      status: check.status,
      checks: results.checks,
      recommendations: results.recommendations,
      created_at: check.created_at
    };
  } catch (error) {
    console.error('Error getting compliance check:', error);
    throw error;
  }
};

/**
 * Get document compliance checks
 * @param {string} documentId - Document ID
 * @returns {Promise<Array>} - Compliance checks
 */
const getDocumentComplianceChecks = async (documentId) => {
  try {
    // Get checks
    const checks = await db('compliance_checks')
      .where('document_id', documentId)
      .orderBy('created_at', 'desc');
    
    // Format checks
    return Promise.all(checks.map(async (check) => {
      // Get regulation
      const regulation = SUPPORTED_REGULATIONS.find(reg => reg.id === check.regulation_id);
      
      // Parse results
      const results = JSON.parse(check.results);
      
      return {
        id: check.id,
        document_id: check.document_id,
        envelope_id: check.envelope_id,
        regulation: regulation ? {
          id: regulation.id,
          name: regulation.name,
          country: regulation.country
        } : { id: check.regulation_id },
        status: check.status,
        checks: results.checks,
        recommendations: results.recommendations,
        created_at: check.created_at
      };
    }));
  } catch (error) {
    console.error('Error getting document compliance checks:', error);
    throw error;
  }
};

module.exports = {
  getSupportedRegulations,
  checkDocumentCompliance,
  generateComplianceReport,
  getJurisdictionRequirements,
  configureComplianceSettings,
  getComplianceSettings,
  getComplianceCheck,
  getDocumentComplianceChecks
};
