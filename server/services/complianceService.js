/**
 * Compliance Service
 * 
 * This service handles South African ECT Act and POPIA compliance requirements
 * for the Sayina E-Signature platform, including PDF stamping and verification.
 */

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs');
const path = require('path');
const { db } = require('../config/db');
const logger = require('../config/winston');

/**
 * Embeds compliance information into a PDF document
 * 
 * @param {string} documentPath - Path to the source PDF document
 * @param {object} complianceData - Object containing compliance information
 * @param {string} outputPath - Path to save the stamped PDF document
 * @returns {Promise<string>} - Path to stamped document
 */
const embedComplianceData = async (documentPath, complianceData, outputPath) => {
  try {
    // Read the PDF file
    const pdfBytes = fs.readFileSync(documentPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Register fontkit
    pdfDoc.registerFontkit(fontkit);
    
    // Load standard font
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Get all pages of the document
    const pages = pdfDoc.getPages();

    // Add compliance information to metadata
    pdfDoc.setTitle(`Sayina Compliance Verified: ${complianceData.documentName}`);
    pdfDoc.setAuthor('Sayina E-Signature Service');
    pdfDoc.setSubject('Electronically Signed Document with Compliance Verification');
    pdfDoc.setKeywords(`compliance_verified, ect_act_25_2002, popia, timestamp=${complianceData.timestamp}`);
    pdfDoc.setCreator('Sayina E-Signature Compliance Service');

    // Set properties that will be shown in PDF reader info
    pdfDoc.setCustomMetadata('compliance_timestamp', complianceData.timestamp);
    pdfDoc.setCustomMetadata('compliance_signer', complianceData.signerName);
    pdfDoc.setCustomMetadata('compliance_ip', complianceData.ipAddress.split('.').slice(0, 2).join('.') + '.*.*');
    pdfDoc.setCustomMetadata('compliance_legislation', 'ECT Act 25/2002, POPIA');

    // Add visual stamp to every page
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      const isLastPage = i === pages.length - 1;
      
      // Use a more compact stamp for regular pages and a detailed one for the last page
      if (isLastPage) {
        // Create a box for the detailed compliance stamp on the last page
        page.drawRectangle({
          x: 50,
          y: 40,
          width: width - 100,
          height: 70,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 1,
          color: rgb(0.98, 0.98, 0.98),
        });

        // Add compliance text
        page.drawText('Compliance Verification', {
          x: 60,
          y: 95,
          size: 10,
          font: helveticaBold,
          color: rgb(0.2, 0.2, 0.2),
        });

        page.drawText(`Signed by: ${complianceData.signerName}`, {
          x: 60,
          y: 80,
          size: 8,
          font: helveticaFont,
          color: rgb(0.3, 0.3, 0.3),
        });

        page.drawText(`Compliance consent given at: ${new Date(complianceData.timestamp).toLocaleString('en-ZA')}`, {
          x: 60,
          y: 65,
          size: 8,
          font: helveticaFont,
          color: rgb(0.3, 0.3, 0.3),
        });

        page.drawText(`IP: ${complianceData.ipAddress.split('.').slice(0, 2).join('.')}.*.*`, {
          x: 60,
          y: 50,
          size: 8,
          font: helveticaFont,
          color: rgb(0.3, 0.3, 0.3),
        });

        page.drawText('South African ECT Act 25/2002 & POPIA compliant', {
          x: width - 280,
          y: 50,
          size: 8,
          font: helveticaFont,
          color: rgb(0.3, 0.3, 0.3),
        });
      } else {
        // Add a more compact stamp on all other pages
        // Draw a small semi-transparent banner at the bottom of the page
        page.drawRectangle({
          x: 40,
          y: 20,
          width: 200,
          height: 20,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 0.5,
          color: rgb(0.98, 0.98, 0.98, 0.8),
        });

        // Add compact compliance text
        page.drawText(`Signed by ${complianceData.signerName} | ECT Act & POPIA compliant`, {
          x: 45,
          y: 27,
          size: 6,
          font: helveticaFont,
          color: rgb(0.3, 0.3, 0.3),
        });
      }
    }
    
    // Get the last page for reference (used by remaining code)
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();

    // Add QR code or verification link to the last page
    lastPage.drawText('Verify this document at:', {
      x: width - 280,
      y: 30,
      size: 7,
      font: helveticaFont,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Save the PDF with compliance information
    const pdfBytesWithCompliance = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytesWithCompliance);

    logger.info(`Compliance data embedded in document: ${outputPath}`);
    return outputPath;
  } catch (error) {
    logger.error(`Error embedding compliance data: ${error.message}`, { error });
    throw new Error(`Failed to embed compliance data: ${error.message}`);
  }
};

/**
 * Verifies compliance information in a PDF document
 * 
 * @param {string} documentPath - Path to the PDF document to verify
 * @returns {Promise<object>} - Verification result
 */
const verifyComplianceData = async (documentPath) => {
  try {
    // Read the PDF file
    const pdfBytes = fs.readFileSync(documentPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Extract compliance information from metadata
    const complianceTimestamp = pdfDoc.getCustomMetadata('compliance_timestamp');
    const complianceSigner = pdfDoc.getCustomMetadata('compliance_signer');
    const complianceIp = pdfDoc.getCustomMetadata('compliance_ip');
    const keywords = pdfDoc.getKeywords() || '';
    
    // Check if the document has compliance information
    const hasCompliance = Boolean(complianceTimestamp && complianceSigner && 
      (keywords.includes('compliance_verified') || keywords.includes('ect_act_25_2002')));
    
    return {
      verified: hasCompliance,
      timestamp: complianceTimestamp,
      signer: complianceSigner,
      ipAddress: complianceIp,
      isValid: hasCompliance
    };
  } catch (error) {
    logger.error(`Error verifying compliance data: ${error.message}`, { error });
    return {
      verified: false,
      error: error.message
    };
  }
};

/**
 * Records compliance consent in the database
 * 
 * @param {string} envelopeId - Envelope ID
 * @param {string} signerId - Signer ID
 * @param {string} timestamp - Compliance timestamp
 * @param {string} ipAddress - IP address of signer
 * @returns {Promise<object>} - Compliance record
 */
const recordComplianceConsent = async (envelopeId, signerId, timestamp, ipAddress) => {
  try {
    // Get signer information
    const signer = await db('signers')
      .where({ id: signerId })
      .first();
    
    if (!signer) {
      throw new Error('Signer not found');
    }
    
    // Create compliance record
    const [complianceId] = await db('compliance_records').insert({
      id: require('uuid').v4(),
      envelope_id: envelopeId,
      signer_id: signerId,
      signer_name: signer.name,
      signer_email: signer.email,
      compliance_given_at: timestamp,
      ip_address: ipAddress,
      legislation: 'ECT Act 25/2002, POPIA',
      consent_text: 'I consent to sign this document electronically, and acknowledge that my electronic signature carries the same legal weight as a handwritten signature under South African law (ECT Act 25/2002 and POPIA).',
      created_at: new Date().toISOString()
    });

    // Also record in audit trail
    await db('audit_trail').insert({
      id: require('uuid').v4(),
      envelope_id: envelopeId,
      signer_id: signerId,
      event_type: 'compliance_consent_given',
      event_timestamp: timestamp,
      ip_address: ipAddress,
      details: JSON.stringify({
        legislation: 'ECT Act 25/2002, POPIA',
        consent_given: true
      })
    });

    return { 
      success: true, 
      id: complianceId,
      timestamp 
    };
  } catch (error) {
    logger.error(`Error recording compliance consent: ${error.message}`, { error });
    throw new Error(`Failed to record compliance consent: ${error.message}`);
  }
};

/**
 * Gets compliance records for an envelope
 * 
 * @param {string} envelopeId - Envelope ID
 * @returns {Promise<Array>} - Compliance records
 */
const getEnvelopeComplianceRecords = async (envelopeId) => {
  try {
    const records = await db('compliance_records')
      .where({ envelope_id: envelopeId })
      .orderBy('compliance_given_at', 'desc');
    
    return records;
  } catch (error) {
    logger.error(`Error getting compliance records: ${error.message}`, { error });
    throw new Error(`Failed to get compliance records: ${error.message}`);
  }
};

module.exports = {
  embedComplianceData,
  verifyComplianceData,
  recordComplianceConsent,
  getEnvelopeComplianceRecords
};
