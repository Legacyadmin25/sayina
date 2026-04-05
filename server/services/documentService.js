const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const { db } = require('../config/db');

/**
 * Generate a signing URL for a signer
 * @param {string} envelopeId - Envelope ID
 * @param {string} signerId - Signer ID
 * @param {string} token - Access token
 * @returns {string} - Signing URL
 */
const generateSigningUrl = (envelopeId, signerId, token) => {
  const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  return `${baseUrl}/sign/${envelopeId}/${signerId}?token=${token}`;
};

/**
 * Get document metadata (page count, dimensions)
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<Object>} - Document metadata
 */
const getDocumentMetadata = async (filePath) => {
  try {
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    const pages = pdfDoc.getPages();
    const pageMetadata = pages.map((page, index) => {
      const { width, height } = page.getSize();
      return {
        page_number: index + 1,
        width,
        height
      };
    });

    return {
      page_count: pdfDoc.getPageCount(),
      pages: pageMetadata
    };
  } catch (error) {
    console.error('Error getting document metadata:', error);
    throw new Error('Failed to get document metadata');
  }
};

/**
 * Add signature to document
 * @param {string} documentId - Document ID
 * @param {string} signatureImagePath - Path to signature image
 * @param {Array} fields - Fields to add to document
 * @returns {Promise<string>} - Path to signed document
 */
const addSignatureToDocument = async (documentId, signatureImagePath, fields) => {
  try {
    // Get document from database
    const document = await db('documents')
      .where({ id: documentId })
      .first();

    if (!document) {
      throw new Error('Document not found');
    }

    // Load the PDF
    const pdfBytes = fs.readFileSync(document.file_path);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Register fontkit
    pdfDoc.registerFontkit(fontkit);

    // Load standard font
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Process each field
    for (const field of fields) {
      const pageIndex = field.page - 1;
      const page = pdfDoc.getPages()[pageIndex];
      
      if (!page) {
        console.error(`Page ${field.page} not found in document`);
        continue;
      }

      const { width: pageWidth, height: pageHeight } = page.getSize();
      
      // Convert coordinates from percentage to points
      const x = (field.x_position / 100) * pageWidth;
      const y = pageHeight - ((field.y_position / 100) * pageHeight) - (field.height / 100) * pageHeight;
      const fieldWidth = (field.width / 100) * pageWidth;
      const fieldHeight = (field.height / 100) * pageHeight;

      switch (field.type) {
        case 'signature':
          if (field.value && signatureImagePath) {
            // Load signature image
            const signatureImageBytes = fs.readFileSync(signatureImagePath);
            const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
            
            // Calculate dimensions to maintain aspect ratio
            const imgDims = signatureImage.scale(fieldWidth / signatureImage.width);
            
            // Draw signature
            page.drawImage(signatureImage, {
              x,
              y,
              width: imgDims.width,
              height: imgDims.height
            });
          }
          break;
          
        case 'text':
        case 'name':
        case 'email':
        case 'company':
        case 'title':
          if (field.value) {
            // Draw text
            page.drawText(field.value, {
              x,
              y: y + fieldHeight / 2,
              size: field.font_size || 12,
              font: helveticaFont,
              color: rgb(0, 0, 0)
            });
          }
          break;
          
        case 'date':
          if (field.value) {
            // Format date
            const date = new Date(field.value);
            const formattedDate = date.toLocaleDateString('en-ZA', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            });
            
            // Draw date
            page.drawText(formattedDate, {
              x,
              y: y + fieldHeight / 2,
              size: field.font_size || 12,
              font: helveticaFont,
              color: rgb(0, 0, 0)
            });
          }
          break;
          
        case 'checkbox':
          if (field.value === 'true' || field.value === true) {
            // Draw checkbox
            page.drawRectangle({
              x,
              y,
              width: fieldWidth,
              height: fieldHeight,
              borderColor: rgb(0, 0, 0),
              borderWidth: 1
            });
            
            // Draw X
            page.drawLine({
              start: { x, y },
              end: { x: x + fieldWidth, y: y + fieldHeight },
              thickness: 1,
              color: rgb(0, 0, 0)
            });
            
            page.drawLine({
              start: { x, y: y + fieldHeight },
              end: { x: x + fieldWidth, y },
              thickness: 1,
              color: rgb(0, 0, 0)
            });
          }
          break;
          
        case 'initial':
          if (field.value) {
            // Draw initials
            page.drawText(field.value, {
              x,
              y: y + fieldHeight / 2,
              size: field.font_size || 12,
              font: helveticaFont,
              color: rgb(0, 0, 0)
            });
          }
          break;
          
        default:
          console.log(`Field type ${field.type} not supported for PDF rendering`);
      }
    }
    
    // Save the modified PDF
    const modifiedPdfBytes = await pdfDoc.save();
    
    // Create directory for signed documents if it doesn't exist
    const signedDir = path.join(__dirname, '../../uploads/signed');
    if (!fs.existsSync(signedDir)) {
      fs.mkdirSync(signedDir, { recursive: true });
    }
    
    // Generate signed document filename
    const originalFilename = path.basename(document.file_path);
    const signedFilename = `signed_${Date.now()}_${originalFilename}`;
    const signedFilePath = path.join(signedDir, signedFilename);
    
    // Write the modified PDF to disk
    fs.writeFileSync(signedFilePath, modifiedPdfBytes);
    
    return signedFilePath;
  } catch (error) {
    console.error('Error adding signature to document:', error);
    throw new Error('Failed to add signature to document');
  }
};

/**
 * Merge documents into a single PDF
 * @param {Array} documentPaths - Array of document paths
 * @param {string} outputPath - Path to save merged document
 * @returns {Promise<string>} - Path to merged document
 */
const mergeDocuments = async (documentPaths, outputPath) => {
  try {
    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();
    
    // Process each document
    for (const docPath of documentPaths) {
      // Load the PDF
      const pdfBytes = fs.readFileSync(docPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Copy all pages from the source document
      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      
      // Add copied pages to the merged document
      copiedPages.forEach(page => {
        mergedPdf.addPage(page);
      });
    }
    
    // Save the merged PDF
    const mergedPdfBytes = await mergedPdf.save();
    
    // Create directory for merged documents if it doesn't exist
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write the merged PDF to disk
    fs.writeFileSync(outputPath, mergedPdfBytes);
    
    return outputPath;
  } catch (error) {
    console.error('Error merging documents:', error);
    throw new Error('Failed to merge documents');
  }
};

/**
 * Add watermark to document
 * @param {string} documentPath - Path to document
 * @param {string} watermarkText - Watermark text
 * @param {string} outputPath - Path to save watermarked document
 * @returns {Promise<string>} - Path to watermarked document
 */
const addWatermark = async (documentPath, watermarkText, outputPath) => {
  try {
    // Load the PDF
    const pdfBytes = fs.readFileSync(documentPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Register fontkit
    pdfDoc.registerFontkit(fontkit);
    
    // Load standard font
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    
    // Process each page
    const pages = pdfDoc.getPages();
    for (const page of pages) {
      const { width, height } = page.getSize();
      
      // Draw watermark diagonally across the page
      page.drawText(watermarkText, {
        x: width / 2 - 150,
        y: height / 2,
        size: 50,
        font: helveticaFont,
        color: rgb(0.8, 0.8, 0.8),
        opacity: 0.3,
        rotate: {
          type: 'degrees',
          angle: -45
        }
      });
    }
    
    // Save the watermarked PDF
    const watermarkedPdfBytes = await pdfDoc.save();
    
    // Create directory for watermarked documents if it doesn't exist
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write the watermarked PDF to disk
    fs.writeFileSync(outputPath, watermarkedPdfBytes);
    
    return outputPath;
  } catch (error) {
    console.error('Error adding watermark to document:', error);
    throw new Error('Failed to add watermark to document');
  }
};

/**
 * Generate audit trail document
 * @param {string} envelopeId - Envelope ID
 * @param {string} outputPath - Path to save audit trail document
 * @returns {Promise<string>} - Path to audit trail document
 */
const generateAuditTrail = async (envelopeId, outputPath) => {
  try {
    // Get envelope details
    const envelope = await db('envelopes')
      .where({ id: envelopeId })
      .first();
    
    if (!envelope) {
      throw new Error('Envelope not found');
    }
    
    // Get organization details
    const organization = await db('organizations')
      .where({ id: envelope.org_id })
      .first();
    
    // Get signers
    const signers = await db('signers')
      .where({ envelope_id: envelopeId })
      .orderBy('signing_order', 'asc');
    
    // Get documents
    const documents = await db('documents')
      .where({ envelope_id: envelopeId })
      .orderBy('created_at', 'asc');
    
    // Get audit events
    const auditEvents = await db('system_logs')
      .whereRaw(`metadata::jsonb->>'envelope_id' = ?`, [envelopeId])
      .orderBy('created_at', 'asc');
    
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Register fontkit
    pdfDoc.registerFontkit(fontkit);
    
    // Load standard fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Add a page
    const page = pdfDoc.addPage([595, 842]); // A4 size
    
    // Add title
    page.drawText('Audit Trail Certificate', {
      x: 50,
      y: 780,
      size: 24,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0)
    });
    
    // Add envelope details
    page.drawText(`Envelope ID: ${envelope.id}`, {
      x: 50,
      y: 740,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0)
    });
    
    page.drawText(`Envelope Name: ${envelope.name}`, {
      x: 50,
      y: 720,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0)
    });
    
    page.drawText(`Status: ${envelope.status}`, {
      x: 50,
      y: 700,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0)
    });
    
    page.drawText(`Created: ${new Date(envelope.created_at).toLocaleString()}`, {
      x: 50,
      y: 680,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0)
    });
    
    if (envelope.completed_at) {
      page.drawText(`Completed: ${new Date(envelope.completed_at).toLocaleString()}`, {
        x: 50,
        y: 660,
        size: 12,
        font: helveticaFont,
        color: rgb(0, 0, 0)
      });
    }
    
    // Add organization details
    page.drawText('Organization Information', {
      x: 50,
      y: 620,
      size: 16,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0)
    });
    
    page.drawText(`Name: ${organization.name}`, {
      x: 50,
      y: 600,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0)
    });
    
    page.drawText(`Email: ${organization.email}`, {
      x: 50,
      y: 580,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0)
    });
    
    // Add signers section
    page.drawText('Signers', {
      x: 50,
      y: 540,
      size: 16,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0)
    });
    
    let yPos = 520;
    for (const signer of signers) {
      page.drawText(`Name: ${signer.name}`, {
        x: 50,
        y: yPos,
        size: 12,
        font: helveticaFont,
        color: rgb(0, 0, 0)
      });
      
      page.drawText(`Email: ${signer.email}`, {
        x: 50,
        y: yPos - 20,
        size: 12,
        font: helveticaFont,
        color: rgb(0, 0, 0)
      });
      
      page.drawText(`Role: ${signer.role}`, {
        x: 50,
        y: yPos - 40,
        size: 12,
        font: helveticaFont,
        color: rgb(0, 0, 0)
      });
      
      page.drawText(`Status: ${signer.status}`, {
        x: 50,
        y: yPos - 60,
        size: 12,
        font: helveticaFont,
        color: rgb(0, 0, 0)
      });
      
      if (signer.signed_at) {
        page.drawText(`Signed: ${new Date(signer.signed_at).toLocaleString()}`, {
          x: 50,
          y: yPos - 80,
          size: 12,
          font: helveticaFont,
          color: rgb(0, 0, 0)
        });
        
        page.drawText(`IP Address: ${signer.ip_address || 'N/A'}`, {
          x: 50,
          y: yPos - 100,
          size: 12,
          font: helveticaFont,
          color: rgb(0, 0, 0)
        });
      }
      
      yPos -= 120;
      
      // Add a new page if we're running out of space
      if (yPos < 100) {
        const newPage = pdfDoc.addPage([595, 842]);
        yPos = 780;
      }
    }
    
    // Add documents section on a new page
    const docsPage = pdfDoc.addPage([595, 842]);
    
    docsPage.drawText('Documents', {
      x: 50,
      y: 780,
      size: 16,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0)
    });
    
    yPos = 760;
    for (const doc of documents) {
      docsPage.drawText(`Name: ${doc.name}`, {
        x: 50,
        y: yPos,
        size: 12,
        font: helveticaFont,
        color: rgb(0, 0, 0)
      });
      
      docsPage.drawText(`ID: ${doc.id}`, {
        x: 50,
        y: yPos - 20,
        size: 12,
        font: helveticaFont,
        color: rgb(0, 0, 0)
      });
      
      docsPage.drawText(`Added: ${new Date(doc.created_at).toLocaleString()}`, {
        x: 50,
        y: yPos - 40,
        size: 12,
        font: helveticaFont,
        color: rgb(0, 0, 0)
      });
      
      yPos -= 60;
    }
    
    // Add audit trail section
    docsPage.drawText('Audit Trail Events', {
      x: 50,
      y: yPos - 20,
      size: 16,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0)
    });
    
    yPos -= 40;
    for (const event of auditEvents) {
      // Skip if we're running out of space
      if (yPos < 100) {
        const newPage = pdfDoc.addPage([595, 842]);
        yPos = 780;
      }
      
      docsPage.drawText(`${new Date(event.created_at).toLocaleString()} - ${event.action}`, {
        x: 50,
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0, 0, 0)
      });
      
      // Parse metadata
      try {
        const metadata = JSON.parse(event.metadata);
        let metadataText = '';
        
        if (metadata.signer_name) {
          metadataText += `Signer: ${metadata.signer_name}`;
        }
        
        if (metadata.signer_email) {
          metadataText += metadataText ? `, Email: ${metadata.signer_email}` : `Email: ${metadata.signer_email}`;
        }
        
        if (metadata.ip_address) {
          metadataText += metadataText ? `, IP: ${metadata.ip_address}` : `IP: ${metadata.ip_address}`;
        }
        
        if (metadataText) {
          docsPage.drawText(`  ${metadataText}`, {
            x: 70,
            y: yPos - 15,
            size: 9,
            font: helveticaFont,
            color: rgb(0.3, 0.3, 0.3)
          });
          
          yPos -= 30;
        } else {
          yPos -= 15;
        }
      } catch (error) {
        yPos -= 15;
      }
    }
    
    // Add legal disclaimer
    const disclaimerPage = pdfDoc.addPage([595, 842]);
    
    disclaimerPage.drawText('Legal Disclaimer', {
      x: 50,
      y: 780,
      size: 16,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0)
    });
    
    const disclaimer = `This audit trail certificate provides a record of the electronic signature process for the envelope. It is provided as evidence of the signing process in accordance with the Electronic Communications and Transactions Act 25 of 2002 (ECT Act) of South Africa.

The electronic signatures contained in this document are legally binding as per Section 13 of the ECT Act, which recognizes electronic signatures as valid and enforceable.

This certificate records the date, time, and IP address of each signing event, as well as other relevant metadata to establish the authenticity of the signing process.

Sayina e-Signature Service maintains secure and tamper-evident records of all signature events, and this certificate serves as proof of those events.`;
    
    const lines = disclaimer.split('\n\n');
    let y = 760;
    
    for (const line of lines) {
      disclaimerPage.drawText(line, {
        x: 50,
        y,
        size: 12,
        font: helveticaFont,
        color: rgb(0, 0, 0),
        lineHeight: 16,
        maxWidth: 495
      });
      
      y -= 60;
    }
    
    // Add certification
    disclaimerPage.drawText('Certification', {
      x: 50,
      y: 500,
      size: 16,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0)
    });
    
    disclaimerPage.drawText(`This audit trail certificate was generated by Sayina e-Signature Service on ${new Date().toLocaleString()}.`, {
      x: 50,
      y: 480,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0)
    });
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    
    // Create directory for audit trails if it doesn't exist
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write the PDF to disk
    fs.writeFileSync(outputPath, pdfBytes);
    
    return outputPath;
  } catch (error) {
    console.error('Error generating audit trail:', error);
    throw new Error('Failed to generate audit trail');
  }
};

module.exports = {
  generateSigningUrl,
  getDocumentMetadata,
  addSignatureToDocument,
  mergeDocuments,
  addWatermark,
  generateAuditTrail
};
