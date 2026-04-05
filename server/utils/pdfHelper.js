const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs');
const path = require('path');

/**
 * Get PDF metadata
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<Object>} - PDF metadata
 */
const getPdfMetadata = async (filePath) => {
  try {
    // Read PDF file
    const pdfBytes = fs.readFileSync(filePath);
    
    // Load PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Get page count
    const pageCount = pdfDoc.getPageCount();
    
    // Get page dimensions
    const pages = pdfDoc.getPages();
    const pageDimensions = pages.map((page, index) => {
      const { width, height } = page.getSize();
      return {
        page: index + 1,
        width,
        height
      };
    });
    
    return {
      pageCount,
      pageDimensions
    };
  } catch (error) {
    console.error('Error getting PDF metadata:', error);
    throw new Error('Failed to get PDF metadata');
  }
};

/**
 * Add watermark to PDF
 * @param {string} inputPath - Path to input PDF
 * @param {string} outputPath - Path to output PDF
 * @param {string} watermarkText - Watermark text
 * @param {Object} options - Watermark options
 * @returns {Promise<string>} - Path to watermarked PDF
 */
const addWatermark = async (inputPath, outputPath, watermarkText, options = {}) => {
  try {
    // Default options
    const {
      opacity = 0.3,
      color = rgb(0.8, 0.8, 0.8),
      fontSize = 50,
      angle = -45
    } = options;
    
    // Read PDF file
    const pdfBytes = fs.readFileSync(inputPath);
    
    // Load PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Register fontkit
    pdfDoc.registerFontkit(fontkit);
    
    // Embed font
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    
    // Add watermark to each page
    const pages = pdfDoc.getPages();
    for (const page of pages) {
      const { width, height } = page.getSize();
      
      // Draw watermark
      page.drawText(watermarkText, {
        x: width / 2 - 150,
        y: height / 2,
        size: fontSize,
        font,
        color,
        opacity,
        rotate: {
          type: 'degrees',
          angle
        }
      });
    }
    
    // Save PDF
    const watermarkedPdfBytes = await pdfDoc.save();
    
    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write watermarked PDF to file
    fs.writeFileSync(outputPath, watermarkedPdfBytes);
    
    return outputPath;
  } catch (error) {
    console.error('Error adding watermark to PDF:', error);
    throw new Error('Failed to add watermark to PDF');
  }
};

/**
 * Merge multiple PDFs into one
 * @param {Array} inputPaths - Array of input PDF paths
 * @param {string} outputPath - Path to output PDF
 * @returns {Promise<string>} - Path to merged PDF
 */
const mergePdfs = async (inputPaths, outputPath) => {
  try {
    // Create new PDF document
    const mergedPdf = await PDFDocument.create();
    
    // Process each input PDF
    for (const inputPath of inputPaths) {
      // Read PDF file
      const pdfBytes = fs.readFileSync(inputPath);
      
      // Load PDF document
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Copy pages from source document
      const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      
      // Add pages to merged document
      pages.forEach(page => {
        mergedPdf.addPage(page);
      });
    }
    
    // Save merged PDF
    const mergedPdfBytes = await mergedPdf.save();
    
    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write merged PDF to file
    fs.writeFileSync(outputPath, mergedPdfBytes);
    
    return outputPath;
  } catch (error) {
    console.error('Error merging PDFs:', error);
    throw new Error('Failed to merge PDFs');
  }
};

/**
 * Add signature to PDF
 * @param {string} inputPath - Path to input PDF
 * @param {string} outputPath - Path to output PDF
 * @param {Array} fields - Array of field objects
 * @returns {Promise<string>} - Path to signed PDF
 */
const addSignatureToPdf = async (inputPath, outputPath, fields) => {
  try {
    // Read PDF file
    const pdfBytes = fs.readFileSync(inputPath);
    
    // Load PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Register fontkit
    pdfDoc.registerFontkit(fontkit);
    
    // Embed font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Process each field
    for (const field of fields) {
      // Get page
      const pageIndex = field.page - 1;
      const page = pdfDoc.getPages()[pageIndex];
      
      if (!page) {
        console.error(`Page ${field.page} not found in document`);
        continue;
      }
      
      // Get page dimensions
      const { width: pageWidth, height: pageHeight } = page.getSize();
      
      // Convert coordinates from percentage to points
      const x = (field.x_position / 100) * pageWidth;
      const y = pageHeight - ((field.y_position / 100) * pageHeight) - (field.height / 100) * pageHeight;
      const fieldWidth = (field.width / 100) * pageWidth;
      const fieldHeight = (field.height / 100) * pageHeight;
      
      // Process field based on type
      switch (field.type) {
        case 'signature':
          if (field.value && field.signature_path) {
            // Load signature image
            const signatureBytes = fs.readFileSync(field.signature_path);
            const signatureImage = await pdfDoc.embedPng(signatureBytes);
            
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
              font,
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
              font,
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
              font,
              color: rgb(0, 0, 0)
            });
          }
          break;
          
        default:
          console.log(`Field type ${field.type} not supported for PDF rendering`);
      }
    }
    
    // Save PDF
    const signedPdfBytes = await pdfDoc.save();
    
    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write signed PDF to file
    fs.writeFileSync(outputPath, signedPdfBytes);
    
    return outputPath;
  } catch (error) {
    console.error('Error adding signature to PDF:', error);
    throw new Error('Failed to add signature to PDF');
  }
};

/**
 * Generate audit trail PDF
 * @param {Object} envelopeData - Envelope data
 * @param {string} outputPath - Path to output PDF
 * @returns {Promise<string>} - Path to audit trail PDF
 */
const generateAuditTrailPdf = async (envelopeData, outputPath) => {
  try {
    const {
      envelope,
      organization,
      signers,
      documents,
      events
    } = envelopeData;
    
    // Create new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Register fontkit
    pdfDoc.registerFontkit(fontkit);
    
    // Embed fonts
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
    for (const event of events) {
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
    
    // Save PDF
    const auditTrailPdfBytes = await pdfDoc.save();
    
    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write audit trail PDF to file
    fs.writeFileSync(outputPath, auditTrailPdfBytes);
    
    return outputPath;
  } catch (error) {
    console.error('Error generating audit trail PDF:', error);
    throw new Error('Failed to generate audit trail PDF');
  }
};

module.exports = {
  getPdfMetadata,
  addWatermark,
  mergePdfs,
  addSignatureToPdf,
  generateAuditTrailPdf
};
