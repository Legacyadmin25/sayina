/**
 * Document Comparison Service
 * 
 * This service provides functionality to compare different versions of documents
 * and identify changes between them for the Sayina E-Signature platform.
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const { db } = require('../config/db');
const { logSystemEvent } = require('./loggerService');

/**
 * Compare two PDF documents and generate a comparison report
 * @param {string} originalDocId - Original document ID
 * @param {string} revisedDocId - Revised document ID
 * @param {Object} options - Comparison options
 * @returns {Promise<Object>} - Comparison result
 */
const compareDocuments = async (originalDocId, revisedDocId, options = {}) => {
  try {
    // Get document details
    const originalDoc = await db('documents')
      .where('id', originalDocId)
      .first();
    
    const revisedDoc = await db('documents')
      .where('id', revisedDocId)
      .first();
    
    if (!originalDoc || !revisedDoc) {
      throw new Error('One or both documents not found');
    }
    
    // Check if documents belong to the same organization
    if (originalDoc.org_id !== revisedDoc.org_id) {
      throw new Error('Documents must belong to the same organization');
    }
    
    // Check if documents are PDFs
    if (!originalDoc.file_type.includes('pdf') || !revisedDoc.file_type.includes('pdf')) {
      throw new Error('Document comparison is only supported for PDF files');
    }
    
    // Create comparison record
    const [comparisonId] = await db('document_comparisons').insert({
      id: uuidv4(),
      org_id: originalDoc.org_id,
      original_document_id: originalDocId,
      revised_document_id: revisedDocId,
      status: 'processing',
      options: JSON.stringify(options)
    }).returning('id');
    
    // Perform comparison
    const comparisonResult = await performDocumentComparison(originalDoc, revisedDoc, options);
    
    // Update comparison record
    await db('document_comparisons')
      .where('id', comparisonId)
      .update({
        status: 'completed',
        result_file_path: comparisonResult.resultFilePath,
        text_changes: comparisonResult.textChanges,
        page_count: comparisonResult.pageCount,
        completed_at: db.fn.now()
      });
    
    return {
      comparison_id: comparisonId,
      original_document: {
        id: originalDoc.id,
        name: originalDoc.name
      },
      revised_document: {
        id: revisedDoc.id,
        name: revisedDoc.name
      },
      result_file_path: comparisonResult.resultFilePath,
      text_changes: comparisonResult.textChanges,
      page_count: comparisonResult.pageCount
    };
  } catch (error) {
    console.error('Error comparing documents:', error);
    throw error;
  }
};

/**
 * Perform document comparison between two PDFs
 * @param {Object} originalDoc - Original document object
 * @param {Object} revisedDoc - Revised document object
 * @param {Object} options - Comparison options
 * @returns {Promise<Object>} - Comparison result
 */
const performDocumentComparison = async (originalDoc, revisedDoc, options = {}) => {
  try {
    // Read PDF files
    const originalPdfBytes = fs.readFileSync(originalDoc.file_path);
    const revisedPdfBytes = fs.readFileSync(revisedDoc.file_path);
    
    // Load PDFs
    const originalPdf = await PDFDocument.load(originalPdfBytes);
    const revisedPdf = await PDFDocument.load(revisedPdfBytes);
    
    // Extract text from both documents
    const originalText = await extractTextFromPdf(originalPdf);
    const revisedText = await extractTextFromPdf(revisedPdf);
    
    // Compare text content
    const textChanges = compareTextContent(originalText, revisedText);
    
    // Create comparison PDF
    const resultFilePath = await createComparisonPdf(originalPdf, revisedPdf, textChanges, options);
    
    return {
      resultFilePath,
      textChanges,
      pageCount: Math.max(originalPdf.getPageCount(), revisedPdf.getPageCount())
    };
  } catch (error) {
    console.error('Error performing document comparison:', error);
    throw error;
  }
};

/**
 * Extract text from PDF document
 * @param {PDFDocument} pdfDoc - PDF document
 * @returns {Promise<Array>} - Array of text content by page
 */
const extractTextFromPdf = async (pdfDoc) => {
  // Note: In a real implementation, you would use a PDF text extraction library
  // like pdf.js or pdfjs-dist. This is a simplified placeholder.
  
  // For demonstration purposes, we'll return placeholder text by page
  const pageCount = pdfDoc.getPageCount();
  const textByPage = [];
  
  for (let i = 0; i < pageCount; i++) {
    // Placeholder for text extraction
    textByPage.push(`Page ${i + 1} content would be extracted here`);
  }
  
  return textByPage;
};

/**
 * Compare text content between original and revised documents
 * @param {Array} originalText - Original text content by page
 * @param {Array} revisedText - Revised text content by page
 * @returns {Object} - Text changes
 */
const compareTextContent = (originalText, revisedText) => {
  // Note: In a real implementation, you would use a text diff algorithm
  // like diff-match-patch or jsdiff. This is a simplified placeholder.
  
  const changes = {
    additions: [],
    deletions: [],
    modifications: []
  };
  
  // Compare page counts
  const originalPageCount = originalText.length;
  const revisedPageCount = revisedText.length;
  
  // Check for added or removed pages
  if (revisedPageCount > originalPageCount) {
    for (let i = originalPageCount; i < revisedPageCount; i++) {
      changes.additions.push({
        type: 'page',
        page: i + 1,
        content: `Page ${i + 1} added`
      });
    }
  } else if (originalPageCount > revisedPageCount) {
    for (let i = revisedPageCount; i < originalPageCount; i++) {
      changes.deletions.push({
        type: 'page',
        page: i + 1,
        content: `Page ${i + 1} removed`
      });
    }
  }
  
  // Compare content of each page
  const pagesToCompare = Math.min(originalPageCount, revisedPageCount);
  
  for (let i = 0; i < pagesToCompare; i++) {
    // Placeholder for text comparison
    // In a real implementation, you would compare the actual text content
    if (originalText[i] !== revisedText[i]) {
      changes.modifications.push({
        type: 'content',
        page: i + 1,
        content: `Content on page ${i + 1} was modified`
      });
    }
  }
  
  return changes;
};

/**
 * Create comparison PDF highlighting differences
 * @param {PDFDocument} originalPdf - Original PDF document
 * @param {PDFDocument} revisedPdf - Revised PDF document
 * @param {Object} textChanges - Text changes
 * @param {Object} options - Comparison options
 * @returns {Promise<string>} - Path to comparison PDF
 */
const createComparisonPdf = async (originalPdf, revisedPdf, textChanges, options = {}) => {
  try {
    // Create a new PDF document
    const comparisonPdf = await PDFDocument.create();
    
    // Copy pages from original document
    const originalPages = await comparisonPdf.copyPages(originalPdf, originalPdf.getPageIndices());
    
    // Add original pages to comparison document
    for (const page of originalPages) {
      comparisonPdf.addPage(page);
    }
    
    // Copy pages from revised document
    const revisedPages = await comparisonPdf.copyPages(revisedPdf, revisedPdf.getPageIndices());
    
    // Add revised pages to comparison document
    for (const page of revisedPages) {
      comparisonPdf.addPage(page);
    }
    
    // Add summary page
    const summaryPage = comparisonPdf.addPage();
    
    // Add title
    summaryPage.drawText('Document Comparison Summary', {
      x: 50,
      y: summaryPage.getHeight() - 50,
      size: 24,
      color: rgb(0, 0, 0)
    });
    
    // Add original document info
    summaryPage.drawText('Original Document:', {
      x: 50,
      y: summaryPage.getHeight() - 100,
      size: 14,
      color: rgb(0, 0, 0)
    });
    
    summaryPage.drawText(`Pages: ${originalPdf.getPageCount()}`, {
      x: 70,
      y: summaryPage.getHeight() - 120,
      size: 12,
      color: rgb(0, 0, 0)
    });
    
    // Add revised document info
    summaryPage.drawText('Revised Document:', {
      x: 50,
      y: summaryPage.getHeight() - 150,
      size: 14,
      color: rgb(0, 0, 0)
    });
    
    summaryPage.drawText(`Pages: ${revisedPdf.getPageCount()}`, {
      x: 70,
      y: summaryPage.getHeight() - 170,
      size: 12,
      color: rgb(0, 0, 0)
    });
    
    // Add changes summary
    summaryPage.drawText('Changes Summary:', {
      x: 50,
      y: summaryPage.getHeight() - 200,
      size: 14,
      color: rgb(0, 0, 0)
    });
    
    summaryPage.drawText(`Additions: ${textChanges.additions.length}`, {
      x: 70,
      y: summaryPage.getHeight() - 220,
      size: 12,
      color: rgb(0, 0.5, 0)
    });
    
    summaryPage.drawText(`Deletions: ${textChanges.deletions.length}`, {
      x: 70,
      y: summaryPage.getHeight() - 240,
      size: 12,
      color: rgb(0.8, 0, 0)
    });
    
    summaryPage.drawText(`Modifications: ${textChanges.modifications.length}`, {
      x: 70,
      y: summaryPage.getHeight() - 260,
      size: 12,
      color: rgb(0, 0, 0.8)
    });
    
    // Add detailed changes
    let yPosition = summaryPage.getHeight() - 300;
    
    summaryPage.drawText('Detailed Changes:', {
      x: 50,
      y: yPosition,
      size: 14,
      color: rgb(0, 0, 0)
    });
    
    yPosition -= 20;
    
    // Add additions
    for (const addition of textChanges.additions) {
      summaryPage.drawText(`Added: ${addition.content}`, {
        x: 70,
        y: yPosition,
        size: 10,
        color: rgb(0, 0.5, 0)
      });
      
      yPosition -= 15;
      
      // Add new page if needed
      if (yPosition < 50) {
        const newPage = comparisonPdf.addPage();
        yPosition = newPage.getHeight() - 50;
      }
    }
    
    // Add deletions
    for (const deletion of textChanges.deletions) {
      summaryPage.drawText(`Deleted: ${deletion.content}`, {
        x: 70,
        y: yPosition,
        size: 10,
        color: rgb(0.8, 0, 0)
      });
      
      yPosition -= 15;
      
      // Add new page if needed
      if (yPosition < 50) {
        const newPage = comparisonPdf.addPage();
        yPosition = newPage.getHeight() - 50;
      }
    }
    
    // Add modifications
    for (const modification of textChanges.modifications) {
      summaryPage.drawText(`Modified: ${modification.content}`, {
        x: 70,
        y: yPosition,
        size: 10,
        color: rgb(0, 0, 0.8)
      });
      
      yPosition -= 15;
      
      // Add new page if needed
      if (yPosition < 50) {
        const newPage = comparisonPdf.addPage();
        yPosition = newPage.getHeight() - 50;
      }
    }
    
    // Save comparison PDF
    const comparisonPdfBytes = await comparisonPdf.save();
    
    // Create directory if it doesn't exist
    const comparisonDir = path.join(__dirname, '..', 'uploads', 'comparisons');
    if (!fs.existsSync(comparisonDir)) {
      fs.mkdirSync(comparisonDir, { recursive: true });
    }
    
    // Save file
    const resultFilePath = path.join(comparisonDir, `comparison_${Date.now()}.pdf`);
    fs.writeFileSync(resultFilePath, comparisonPdfBytes);
    
    return resultFilePath;
  } catch (error) {
    console.error('Error creating comparison PDF:', error);
    throw error;
  }
};

/**
 * Get document comparison by ID
 * @param {string} comparisonId - Comparison ID
 * @returns {Promise<Object>} - Comparison details
 */
const getDocumentComparison = async (comparisonId) => {
  try {
    // Get comparison
    const comparison = await db('document_comparisons')
      .where('id', comparisonId)
      .first();
    
    if (!comparison) {
      throw new Error('Comparison not found');
    }
    
    // Get document details
    const originalDoc = await db('documents')
      .where('id', comparison.original_document_id)
      .first();
    
    const revisedDoc = await db('documents')
      .where('id', comparison.revised_document_id)
      .first();
    
    return {
      id: comparison.id,
      org_id: comparison.org_id,
      status: comparison.status,
      original_document: {
        id: originalDoc.id,
        name: originalDoc.name,
        file_path: originalDoc.file_path
      },
      revised_document: {
        id: revisedDoc.id,
        name: revisedDoc.name,
        file_path: revisedDoc.file_path
      },
      result_file_path: comparison.result_file_path,
      text_changes: comparison.text_changes,
      page_count: comparison.page_count,
      created_at: comparison.created_at,
      completed_at: comparison.completed_at
    };
  } catch (error) {
    console.error('Error getting document comparison:', error);
    throw error;
  }
};

/**
 * Get organization document comparisons
 * @param {string} orgId - Organization ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Comparisons
 */
const getOrganizationComparisons = async (orgId, options = {}) => {
  try {
    const {
      limit = 20,
      offset = 0
    } = options;
    
    // Get comparisons
    const comparisons = await db('document_comparisons')
      .where('org_id', orgId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    // Format comparisons
    const formattedComparisons = [];
    
    for (const comparison of comparisons) {
      // Get document details
      const originalDoc = await db('documents')
        .where('id', comparison.original_document_id)
        .select('id', 'name')
        .first();
      
      const revisedDoc = await db('documents')
        .where('id', comparison.revised_document_id)
        .select('id', 'name')
        .first();
      
      formattedComparisons.push({
        id: comparison.id,
        status: comparison.status,
        original_document: originalDoc,
        revised_document: revisedDoc,
        page_count: comparison.page_count,
        created_at: comparison.created_at,
        completed_at: comparison.completed_at
      });
    }
    
    return formattedComparisons;
  } catch (error) {
    console.error('Error getting organization comparisons:', error);
    throw error;
  }
};

module.exports = {
  compareDocuments,
  getDocumentComparison,
  getOrganizationComparisons
};
