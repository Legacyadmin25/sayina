/**
 * Email Confirmation Service
 * 
 * This service handles sending confirmation emails with compliance details
 * after documents are signed in the Sayina E-Signature platform.
 */

const path = require('path');
const fs = require('fs');
const { db } = require('../config/db');
const { sendEmail } = require('./emailService');
const logger = require('../config/winston');

/**
 * Send confirmation email to document owner after signing
 * 
 * @param {string} envelopeId - Envelope ID
 * @param {object} options - Additional options
 * @returns {Promise<object>} - Email sending result
 */
const sendOwnerConfirmationEmail = async (envelopeId, options = {}) => {
  try {
    // Get envelope details
    const envelope = await db('envelopes')
      .join('users', 'envelopes.created_by', 'users.id')
      .join('organizations', 'envelopes.org_id', 'organizations.id')
      .where('envelopes.id', envelopeId)
      .select(
        'envelopes.id',
        'envelopes.name',
        'envelopes.status',
        'users.email as owner_email',
        'users.name as owner_name',
        'organizations.name as org_name',
        'organizations.logo_url'
      )
      .first();

    if (!envelope) {
      throw new Error('Envelope not found');
    }

    // Get signed document path
    const document = await db('documents')
      .where('envelope_id', envelopeId)
      .select('file_path', 'name')
      .first();

    if (!document) {
      throw new Error('No document found for this envelope');
    }

    // Get compliance records
    const complianceRecords = await db('compliance_records')
      .where('envelope_id', envelopeId)
      .join('signers', 'compliance_records.signer_id', 'signers.id')
      .select(
        'compliance_records.signer_name',
        'compliance_records.compliance_given_at',
        'compliance_records.ip_address',
        'signers.role'
      );

    // Build compliance HTML section
    let complianceHtml = '<h3>Compliance Information</h3>';
    complianceHtml += '<table style="border-collapse: collapse; width: 100%;">';
    complianceHtml += '<tr style="background-color: #f2f2f2;"><th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Signer</th><th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Role</th><th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Consent Time</th></tr>';
    
    complianceRecords.forEach(record => {
      complianceHtml += `<tr>
        <td style="border: 1px solid #ddd; padding: 8px;">${record.signer_name}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${record.role || 'Signer'}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${new Date(record.compliance_given_at).toLocaleString('en-ZA')}</td>
      </tr>`;
    });
    
    complianceHtml += '</table>';
    complianceHtml += '<p style="font-size: 0.9em; color: #666;">All signers have provided explicit consent in accordance with South African ECT Act 25/2002 and POPIA regulations.</p>';

    // Generate audit trail and download links
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const auditLink = `${baseUrl}/audit/compliance/${envelopeId}`;
    const downloadLink = `${baseUrl}/documents/signed/${envelopeId}`;
    
    // Build email HTML
    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #3a86ff; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
          ${envelope.logo_url ? `<img src="${envelope.logo_url}" alt="${envelope.org_name}" style="max-height: 60px;" />` : ''}
          <h2 style="color: #ffffff; margin: 0;">Document Signed: ${envelope.name}</h2>
        </div>

        <div style="padding: 20px;">
          <p>Hello ${envelope.owner_name},</p>

          <p>Your document <strong>${envelope.name}</strong> has been successfully signed by all parties and is now complete.</p>

          ${complianceHtml}

          <div style="margin-top: 20px; text-align: center;">
            <a href="${downloadLink}" style="background-color: #3a86ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px; font-weight: bold;">
              Download Signed Document
            </a>
            <a href="${auditLink}" style="background-color: #3a86ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View Audit Trail
            </a>
          </div>

          <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
            This email contains a legally binding electronically signed document.
            The document has been signed in accordance with South African Electronic Communications and Transactions Act (ECT Act 25/2002)
            and Protection of Personal Information Act (POPIA).
          </p>
        </div>

        <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 0.8em; color: #666; border-top: 1px solid #eee;">
          <p>&copy; ${new Date().getFullYear()} ${envelope.org_name || 'Sayina'}. All rights reserved.</p>
          <p>This is an automated message from ${envelope.org_name || 'Sayina'}.</p>
          <p>Powered by <strong>Sayina</strong> E-Signature Service</p>
        </div>
      </div>
    `;

    // Prepare attachments
    const attachments = [];
    
    // Add signed document if it exists
    if (document.file_path && fs.existsSync(document.file_path)) {
      attachments.push({
        filename: `${document.name || 'signed-document'}.pdf`,
        path: document.file_path
      });
    }

    // Add audit trail if requested
    if (options.includeAudit) {
      const auditTrailPath = path.join(__dirname, `../../uploads/audit_trails/${envelopeId}_audit.pdf`);
      
      if (fs.existsSync(auditTrailPath)) {
        attachments.push({
          filename: 'compliance-audit-trail.pdf',
          path: auditTrailPath
        });
      }
    }

    // Send email
    const result = await sendEmail(
      envelope.owner_email,
      `Document Signed: ${envelope.name}`,
      html,
      attachments
    );

    logger.info(`Owner confirmation email sent for envelope ${envelopeId}`, { result });
    return result;
  } catch (error) {
    logger.error(`Error sending owner confirmation email: ${error.message}`, { error });
    throw new Error(`Failed to send owner confirmation email: ${error.message}`);
  }
};

/**
 * Send confirmation email to signer after signing
 * 
 * @param {string} envelopeId - Envelope ID
 * @param {string} signerId - Signer ID
 * @param {object} options - Additional options
 * @returns {Promise<object>} - Email sending result
 */
const sendSignerConfirmationEmail = async (envelopeId, signerId, options = {}) => {
  try {
    // Get signer details
    const signer = await db('signers')
      .join('envelopes', 'signers.envelope_id', 'envelopes.id')
      .join('organizations', 'envelopes.org_id', 'organizations.id')
      .where('signers.id', signerId)
      .select(
        'signers.id',
        'signers.name',
        'signers.email',
        'envelopes.id as envelope_id',
        'envelopes.name as envelope_name',
        'organizations.name as org_name',
        'organizations.logo_url'
      )
      .first();

    if (!signer) {
      throw new Error('Signer not found');
    }

    // Get compliance record
    const complianceRecord = await db('compliance_records')
      .where({
        envelope_id: envelopeId,
        signer_id: signerId
      })
      .first();

    // Get signed document path
    const document = await db('documents')
      .where('envelope_id', envelopeId)
      .select('file_path', 'name')
      .first();

    // Generate audit trail and download links
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const auditLink = `${baseUrl}/audit/compliance/${envelopeId}`;
    const downloadLink = `${baseUrl}/documents/signed/${envelopeId}`;
    
    // Build email HTML
    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #3a86ff; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
          ${signer.logo_url ? `<img src="${signer.logo_url}" alt="${signer.org_name}" style="max-height: 60px;" />` : ''}
          <h2 style="color: #ffffff; margin: 0;">Your Signed Document</h2>
        </div>

        <div style="padding: 20px;">
          <p>Hello ${signer.name},</p>

          <p>Thank you for signing <strong>${signer.envelope_name}</strong>.</p>

          <p>You signed this document on <strong>${complianceRecord ? new Date(complianceRecord.compliance_given_at).toLocaleString('en-ZA') : new Date().toLocaleString('en-ZA')}</strong>.</p>

          <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #3a86ff;">
            <h4 style="margin-top: 0;">Compliance Confirmation</h4>
            <p>Your consent was recorded in accordance with South African Electronic Communications and Transactions Act (ECT Act 25/2002) and Protection of Personal Information Act (POPIA).</p>
            <p style="font-size: 0.9em; margin-bottom: 0;">This electronic signature carries the same legal weight as a handwritten signature.</p>
          </div>

          <div style="margin-top: 20px; text-align: center;">
            <a href="${downloadLink}" style="background-color: #3a86ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px; font-weight: bold;">
              Download Signed Document
            </a>
            <a href="${auditLink}" style="background-color: #3a86ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View Audit Trail
            </a>
          </div>

          <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
            A copy of the signed document is attached to this email for your records.
          </p>
        </div>

        <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 0.8em; color: #666; border-top: 1px solid #eee;">
          <p>&copy; ${new Date().getFullYear()} ${signer.org_name || 'Sayina'}. All rights reserved.</p>
          <p>This is an automated message from ${signer.org_name || 'Sayina'}.</p>
          <p>Powered by <strong>Sayina</strong> E-Signature Service</p>
        </div>
      </div>
    `;

    // Prepare attachments
    const attachments = [];
    
    // Add signed document if it exists
    if (document && document.file_path && fs.existsSync(document.file_path)) {
      attachments.push({
        filename: `${document.name || 'signed-document'}.pdf`,
        path: document.file_path
      });
    }

    // Send email
    const result = await sendEmail(
      signer.email,
      'Your Signed Document',
      html,
      attachments
    );

    logger.info(`Signer confirmation email sent for envelope ${envelopeId}, signer ${signerId}`, { result });
    return result;
  } catch (error) {
    logger.error(`Error sending signer confirmation email: ${error.message}`, { error });
    throw new Error(`Failed to send signer confirmation email: ${error.message}`);
  }
};

/**
 * Send confirmation emails to all participants after envelope is completed
 * 
 * @param {string} envelopeId - Envelope ID
 * @returns {Promise<object>} - Email sending results
 */
const sendAllConfirmationEmails = async (envelopeId) => {
  try {
    // Send to owner
    const ownerResult = await sendOwnerConfirmationEmail(envelopeId, { includeAudit: true });
    
    // Get all signers
    const signers = await db('signers')
      .where('envelope_id', envelopeId)
      .select('id');
    
    // Send to each signer
    const signerResults = await Promise.all(
      signers.map(signer => sendSignerConfirmationEmail(envelopeId, signer.id))
    );
    
    return {
      success: true,
      ownerResult,
      signerResults
    };
  } catch (error) {
    logger.error(`Error sending all confirmation emails: ${error.message}`, { error });
    throw new Error(`Failed to send all confirmation emails: ${error.message}`);
  }
};

/**
 * Endpoint to manually trigger confirmation emails
 * 
 * @param {string} envelopeId - Envelope ID
 * @param {object} options - Options including recipientType and signerId
 * @returns {Promise<object>} - Email sending result
 */
const sendConfirmationEmail = async (envelopeId, options = {}) => {
  const { recipientType, signerId, includeAudit } = options;
  
  try {
    // Check if envelope exists and is completed
    const envelope = await db('envelopes')
      .where('id', envelopeId)
      .first();
    
    if (!envelope) {
      throw new Error('Envelope not found');
    }
    
    if (envelope.status !== 'completed') {
      throw new Error('Confirmation emails can only be sent for completed envelopes');
    }
    
    if (recipientType === 'owner') {
      return await sendOwnerConfirmationEmail(envelopeId, { includeAudit });
    } else if (recipientType === 'signer' && signerId) {
      return await sendSignerConfirmationEmail(envelopeId, signerId);
    } else if (recipientType === 'all' || !recipientType) {
      return await sendAllConfirmationEmails(envelopeId);
    } else {
      throw new Error('Invalid recipient type or missing signer ID');
    }
  } catch (error) {
    logger.error(`Error sending confirmation email: ${error.message}`, { error });
    throw new Error(`Failed to send confirmation email: ${error.message}`);
  }
};

module.exports = {
  sendOwnerConfirmationEmail,
  sendSignerConfirmationEmail,
  sendAllConfirmationEmails,
  sendConfirmationEmail
};
