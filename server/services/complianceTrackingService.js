/**
 * Compliance Tracking Service
 * 
 * This service monitors and enforces compliance with South African e-signature regulations,
 * particularly the Electronic Communications and Transactions Act 25 of 2002 (ECT Act).
 * It provides comprehensive tracking, reporting, and enforcement of compliance requirements.
 */

const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/db');
const { logSystemEvent } = require('./loggerService');
const { validateDocumentCompliance, requiresAdvancedSignature } = require('../utils/complianceHelper');

/**
 * Track compliance event
 * @param {Object} eventData - Compliance event data
 * @returns {Promise<string>} - Event ID
 */
const trackComplianceEvent = async (eventData) => {
  try {
    const {
      org_id,
      user_id,
      envelope_id = null,
      document_id = null,
      signer_id = null,
      event_type,
      event_details,
      compliance_status,
      metadata = {}
    } = eventData;
    
    // Create event record
    const eventId = uuidv4();
    await db('compliance_events').insert({
      id: eventId,
      org_id,
      user_id,
      envelope_id,
      document_id,
      signer_id,
      event_type,
      event_details,
      compliance_status,
      metadata: JSON.stringify(metadata),
      created_at: db.fn.now()
    });
    
    return eventId;
  } catch (error) {
    console.error('Error tracking compliance event:', error);
    throw error;
  }
};

/**
 * Perform compliance assessment for an envelope
 * @param {string} envelopeId - Envelope ID
 * @returns {Promise<Object>} - Assessment result
 */
const assessEnvelopeCompliance = async (envelopeId) => {
  try {
    // Get envelope details
    const envelope = await db('envelopes')
      .where('id', envelopeId)
      .first();
    
    if (!envelope) {
      throw new Error('Envelope not found');
    }
    
    // Get documents in envelope
    const documents = await db('documents')
      .where('envelope_id', envelopeId);
    
    // Get signers in envelope
    const signers = await db('signers')
      .where('envelope_id', envelopeId);
    
    // Assess document compliance
    const documentAssessments = await Promise.all(
      documents.map(async (doc) => {
        const compliance = await validateDocumentCompliance({
          document_type: doc.document_type,
          requires_advanced_signature: doc.requires_advanced_signature
        });
        
        return {
          document_id: doc.id,
          document_name: doc.name,
          compliant: compliance.compliant,
          message: compliance.message,
          requirements: compliance.requirements
        };
      })
    );
    
    // Assess signer verification compliance
    const signerAssessments = signers.map((signer) => {
      const needsAdvancedSignature = documents.some((doc) => 
        doc.requires_advanced_signature || 
        requiresAdvancedSignature(doc.document_type)
      );
      
      const hasProperVerification = 
        (needsAdvancedSignature && signer.verification_level === 'advanced') ||
        (!needsAdvancedSignature && signer.verification_level !== 'none');
      
      return {
        signer_id: signer.id,
        signer_name: `${signer.first_name} ${signer.last_name}`,
        signer_email: signer.email,
        compliant: hasProperVerification,
        message: hasProperVerification 
          ? 'Signer has appropriate verification level' 
          : 'Signer requires higher verification level',
        requirements: {
          needs_advanced_signature: needsAdvancedSignature,
          current_verification: signer.verification_level,
          required_verification: needsAdvancedSignature ? 'advanced' : 'basic'
        }
      };
    });
    
    // Assess overall envelope compliance
    const isCompliant = 
      documentAssessments.every(assessment => assessment.compliant) &&
      signerAssessments.every(assessment => assessment.compliant);
    
    // Create assessment record
    const assessmentId = uuidv4();
    await db('compliance_assessments').insert({
      id: assessmentId,
      envelope_id: envelopeId,
      org_id: envelope.org_id,
      is_compliant: isCompliant,
      documents_assessment: JSON.stringify(documentAssessments),
      signers_assessment: JSON.stringify(signerAssessments),
      created_at: db.fn.now()
    });
    
    // Track compliance event
    await trackComplianceEvent({
      org_id: envelope.org_id,
      envelope_id: envelopeId,
      event_type: 'envelope_compliance_assessment',
      event_details: `Envelope compliance assessment: ${isCompliant ? 'Compliant' : 'Non-compliant'}`,
      compliance_status: isCompliant ? 'compliant' : 'non_compliant',
      metadata: {
        assessment_id: assessmentId,
        document_count: documents.length,
        signer_count: signers.length
      }
    });
    
    return {
      assessment_id: assessmentId,
      envelope_id: envelopeId,
      is_compliant: isCompliant,
      documents: documentAssessments,
      signers: signerAssessments,
      remediation_steps: isCompliant ? [] : generateRemediationSteps(documentAssessments, signerAssessments)
    };
  } catch (error) {
    console.error('Error assessing envelope compliance:', error);
    throw error;
  }
};

/**
 * Generate remediation steps for non-compliant envelope
 * @param {Array} documentAssessments - Document compliance assessments
 * @param {Array} signerAssessments - Signer compliance assessments
 * @returns {Array} - Remediation steps
 */
const generateRemediationSteps = (documentAssessments, signerAssessments) => {
  const steps = [];
  
  // Document remediation steps
  documentAssessments.forEach(doc => {
    if (!doc.compliant) {
      steps.push({
        type: 'document',
        item_id: doc.document_id,
        item_name: doc.document_name,
        issue: doc.message,
        action: doc.requirements.advanced_signature 
          ? 'Enable advanced electronic signature for this document' 
          : 'Review document compliance requirements'
      });
    }
  });
  
  // Signer remediation steps
  signerAssessments.forEach(signer => {
    if (!signer.compliant) {
      steps.push({
        type: 'signer',
        item_id: signer.signer_id,
        item_name: signer.signer_name,
        issue: signer.message,
        action: signer.requirements.needs_advanced_signature 
          ? 'Upgrade signer verification to advanced level' 
          : 'Enable identity verification for this signer'
      });
    }
  });
  
  return steps;
};

/**
 * Generate compliance report for an organization
 * @param {string} orgId - Organization ID
 * @param {Object} options - Report options
 * @returns {Promise<Object>} - Compliance report
 */
const generateComplianceReport = async (orgId, options = {}) => {
  try {
    const {
      start_date,
      end_date = new Date(),
      include_events = true,
      include_assessments = true
    } = options;
    
    // Set default start date to 30 days ago if not provided
    const reportStartDate = start_date 
      ? new Date(start_date) 
      : new Date(end_date.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Get compliance events
    let events = [];
    if (include_events) {
      events = await db('compliance_events')
        .where('org_id', orgId)
        .whereBetween('created_at', [reportStartDate, end_date])
        .orderBy('created_at', 'desc');
    }
    
    // Get compliance assessments
    let assessments = [];
    if (include_assessments) {
      assessments = await db('compliance_assessments')
        .where('org_id', orgId)
        .whereBetween('created_at', [reportStartDate, end_date])
        .orderBy('created_at', 'desc');
    }
    
    // Calculate compliance metrics
    const totalAssessments = assessments.length;
    const compliantAssessments = assessments.filter(a => a.is_compliant).length;
    const complianceRate = totalAssessments > 0 
      ? (compliantAssessments / totalAssessments) * 100 
      : 100;
    
    // Group events by type
    const eventsByType = {};
    events.forEach(event => {
      if (!eventsByType[event.event_type]) {
        eventsByType[event.event_type] = [];
      }
      eventsByType[event.event_type].push(event);
    });
    
    // Generate report
    const reportId = uuidv4();
    const report = {
      id: reportId,
      org_id: orgId,
      report_period: {
        start_date: reportStartDate,
        end_date
      },
      metrics: {
        total_assessments: totalAssessments,
        compliant_assessments: compliantAssessments,
        compliance_rate: complianceRate.toFixed(2),
        total_events: events.length,
        events_by_type: Object.keys(eventsByType).map(type => ({
          type,
          count: eventsByType[type].length
        }))
      },
      assessments: assessments.map(assessment => ({
        id: assessment.id,
        envelope_id: assessment.envelope_id,
        is_compliant: assessment.is_compliant,
        created_at: assessment.created_at
      })),
      events: events.map(event => ({
        id: event.id,
        event_type: event.event_type,
        event_details: event.event_details,
        compliance_status: event.compliance_status,
        created_at: event.created_at
      }))
    };
    
    // Save report to database
    await db('compliance_reports').insert({
      id: reportId,
      org_id: orgId,
      report_data: JSON.stringify(report),
      start_date: reportStartDate,
      end_date,
      created_at: db.fn.now()
    });
    
    return report;
  } catch (error) {
    console.error('Error generating compliance report:', error);
    throw error;
  }
};

/**
 * Get compliance assessment by ID
 * @param {string} assessmentId - Assessment ID
 * @returns {Promise<Object>} - Assessment details
 */
const getComplianceAssessment = async (assessmentId) => {
  try {
    // Get assessment
    const assessment = await db('compliance_assessments')
      .where('id', assessmentId)
      .first();
    
    if (!assessment) {
      throw new Error('Compliance assessment not found');
    }
    
    // Get envelope details
    const envelope = await db('envelopes')
      .where('id', assessment.envelope_id)
      .select('id', 'name', 'status')
      .first();
    
    return {
      id: assessment.id,
      envelope: envelope,
      is_compliant: assessment.is_compliant,
      documents_assessment: JSON.parse(assessment.documents_assessment),
      signers_assessment: JSON.parse(assessment.signers_assessment),
      created_at: assessment.created_at
    };
  } catch (error) {
    console.error('Error getting compliance assessment:', error);
    throw error;
  }
};

/**
 * Get compliance report by ID
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} - Report details
 */
const getComplianceReport = async (reportId) => {
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
      report_data: JSON.parse(report.report_data),
      start_date: report.start_date,
      end_date: report.end_date,
      created_at: report.created_at
    };
  } catch (error) {
    console.error('Error getting compliance report:', error);
    throw error;
  }
};

/**
 * Get organization compliance reports
 * @param {string} orgId - Organization ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Compliance reports
 */
const getOrganizationComplianceReports = async (orgId, options = {}) => {
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
      start_date: report.start_date,
      end_date: report.end_date,
      created_at: report.created_at,
      summary: {
        compliance_rate: JSON.parse(report.report_data).metrics.compliance_rate,
        total_assessments: JSON.parse(report.report_data).metrics.total_assessments,
        total_events: JSON.parse(report.report_data).metrics.total_events
      }
    }));
  } catch (error) {
    console.error('Error getting organization compliance reports:', error);
    throw error;
  }
};

module.exports = {
  trackComplianceEvent,
  assessEnvelopeCompliance,
  generateComplianceReport,
  getComplianceAssessment,
  getComplianceReport,
  getOrganizationComplianceReports
};
