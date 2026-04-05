/**
 * PDF Translation Service
 * 
 * This service provides OCR and translation capabilities for PDF documents in the Sayina E-Signature platform.
 * It supports all 11 official South African languages.
 */

const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { createWorker } = require('tesseract.js');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const db = require('../config/db');
const cacheManager = require('../utils/cacheManager');
const documentService = require('./documentService');
const config = require('../config/config');

// Azure Translator API configuration
const TRANSLATOR_KEY = config.azureTranslatorKey;
const TRANSLATOR_ENDPOINT = config.azureTranslatorEndpoint;
const TRANSLATOR_REGION = config.azureTranslatorRegion;

// Cache configuration
const CACHE_TTL = 3600; // 1 hour cache for translations

// Map of ISO language codes to Tesseract language codes
const LANGUAGE_MAP = {
  'en': 'eng',    // English
  'af': 'afr',    // Afrikaans
  'zu': 'zul',    // isiZulu
  'xh': 'xho',    // isiXhosa
  'st': 'sot',    // Sesotho
  'tn': 'tsn',    // Setswana
  'ts': 'tso',    // Xitsonga
  'ss': 'ssw',    // siSwati
  've': 'ven',    // Tshivenda
  'nr': 'nbl',    // isiNdebele
  'nso': 'nso'    // Sepedi (Northern Sotho)
};

/**
 * Extract text from a PDF document using OCR
 * @param {Buffer} pdfBuffer - PDF document buffer
 * @param {string} sourceLanguage - Source language ISO code
 * @returns {Promise<Array>} - Array of page texts with positions
 */
const extractTextFromPdf = async (pdfBuffer, sourceLanguage) => {
  // Load the PDF document
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const numPages = pdfDoc.getPageCount();
  
  // Initialize Tesseract worker with language data
  const tesseractLang = LANGUAGE_MAP[sourceLanguage] || 'eng';
  const worker = await createWorker(tesseractLang);
  
  // Extract text from each page
  const pagesText = [];
  
  for (let i = 0; i < numPages; i++) {
    // Extract page as image (using a temp file since tesseract works better with files)
    const pageNum = i + 1;
    const tempImagePath = path.join(__dirname, '..', 'temp', `page_${uuidv4()}.png`);
    
    try {
      // Use pdf.js or similar to render PDF page to image
      // This is a simplified version - in production you'd use a proper PDF renderer
      await documentService.renderPageToImage(pdfBuffer, i, tempImagePath);
      
      // Run OCR on the page image
      const { data: { text, blocks } } = await worker.recognize(tempImagePath);
      
      // Store text with positional data
      pagesText.push({
        pageNumber: pageNum,
        text,
        blocks: blocks.map(block => ({
          text: block.text,
          bbox: block.bbox, // Bounding box for text positioning in translated PDF
          confidence: block.confidence
        }))
      });
      
      // Clean up temp file
      await fs.unlink(tempImagePath);
    } catch (error) {
      console.error(`Error processing page ${pageNum}:`, error);
      pagesText.push({
        pageNumber: pageNum,
        text: '',
        blocks: []
      });
    }
  }
  
  // Terminate the worker
  await worker.terminate();
  
  return pagesText;
};

/**
 * Translate text using Azure Translator API
 * @param {string} text - Text to translate
 * @param {string} sourceLanguage - Source language ISO code
 * @param {string} targetLanguage - Target language ISO code
 * @returns {Promise<string>} - Translated text
 */
const translateText = async (text, sourceLanguage, targetLanguage) => {
  if (!text.trim()) {
    return '';
  }
  
  // Check cache first
  const cacheKey = `translation:${sourceLanguage}:${targetLanguage}:${text.substring(0, 100)}`;
  const cachedTranslation = await cacheManager.get(cacheKey);
  
  if (cachedTranslation) {
    return cachedTranslation;
  }
  
  try {
    const response = await axios({
      baseURL: TRANSLATOR_ENDPOINT,
      url: '/translate',
      method: 'post',
      headers: {
        'Ocp-Apim-Subscription-Key': TRANSLATOR_KEY,
        'Ocp-Apim-Subscription-Region': TRANSLATOR_REGION,
        'Content-type': 'application/json'
      },
      params: {
        'api-version': '3.0',
        'from': sourceLanguage,
        'to': targetLanguage
      },
      data: [{
        text
      }],
      responseType: 'json'
    });
    
    const translation = response.data[0]?.translations[0]?.text || '';
    
    // Cache the result
    await cacheManager.set(cacheKey, translation, CACHE_TTL);
    
    return translation;
  } catch (error) {
    console.error('Translation API error:', error.response?.data || error.message);
    throw new Error('Failed to translate text');
  }
};

/**
 * Translate multiple text blocks in parallel
 * @param {Array} textBlocks - Array of text blocks to translate
 * @param {string} sourceLanguage - Source language ISO code
 * @param {string} targetLanguage - Target language ISO code
 * @returns {Promise<Array>} - Array of translated blocks
 */
const translateBlocks = async (textBlocks, sourceLanguage, targetLanguage) => {
  // Process in batches to avoid overwhelming the translation API
  const BATCH_SIZE = 10;
  const results = [];
  
  for (let i = 0; i < textBlocks.length; i += BATCH_SIZE) {
    const batch = textBlocks.slice(i, i + BATCH_SIZE);
    const promises = batch.map(block => 
      translateText(block.text, sourceLanguage, targetLanguage)
        .then(translatedText => ({
          ...block,
          translatedText
        }))
    );
    
    const translatedBatch = await Promise.all(promises);
    results.push(...translatedBatch);
  }
  
  return results;
};

/**
 * Create a PDF with translated text layers
 * @param {Buffer} originalPdfBuffer - Original PDF buffer
 * @param {Array} translatedPages - Translated pages data
 * @returns {Promise<Buffer>} - New PDF buffer with translated text
 */
const createTranslatedPdf = async (originalPdfBuffer, translatedPages) => {
  // Load the original PDF
  const pdfDoc = await PDFDocument.load(originalPdfBuffer);
  
  // Add translated text layers to each page
  // Note: This is a simplified implementation - a production version would need
  // to handle text positioning, fonts, colors, etc. more precisely
  for (const page of translatedPages) {
    const pdfPage = pdfDoc.getPage(page.pageNumber - 1);
    
    // Get page dimensions
    const { width, height } = pdfPage.getSize();
    
    // Add text blocks to the page
    page.blocks.forEach(block => {
      if (!block.translatedText) return;
      
      // Position text based on the original bounding box
      const { x, y, width: blockWidth, height: blockHeight } = block.bbox;
      const fontSize = 10; // Adjust based on block size
      
      pdfPage.drawText(block.translatedText, {
        x: x * width,
        y: height - (y * height) - blockHeight, // Flip y-coordinate
        size: fontSize,
        color: { r: 0, g: 0, b: 0.8 }, // Blue text to distinguish from original
        opacity: 0.9
      });
    });
  }
  
  // Serialize the PDF
  const pdfBytes = await pdfDoc.save();
  
  return Buffer.from(pdfBytes);
};

/**
 * Translate a PDF document
 * @param {string} documentId - Document ID
 * @param {string} sourceLanguage - Source language ISO code
 * @param {string} targetLanguage - Target language ISO code
 * @returns {Promise<Object>} - Result object with translated document details
 */
const translateDocument = async (documentId, sourceLanguage, targetLanguage) => {
  // Get the document from storage
  const documentBuffer = await documentService.getDocumentFile(documentId);
  if (!documentBuffer) {
    throw new Error('Document not found or cannot be accessed');
  }
  
  // Extract text using OCR
  const pagesText = await extractTextFromPdf(documentBuffer, sourceLanguage);
  
  // Translate text blocks for each page
  const translatedPages = [];
  
  for (const page of pagesText) {
    const translatedBlocks = await translateBlocks(page.blocks, sourceLanguage, targetLanguage);
    translatedPages.push({
      pageNumber: page.pageNumber,
      blocks: translatedBlocks
    });
  }
  
  // Create a new PDF with translated text layers
  const translatedPdfBuffer = await createTranslatedPdf(documentBuffer, translatedPages);
  
  // Save the translated document
  const translatedDocId = uuidv4();
  const translatedFileName = `translated_${documentId}_${targetLanguage}.pdf`;
  const translatedFilePath = await documentService.saveDocumentFile(
    translatedPdfBuffer,
    translatedFileName
  );
  
  // Store translation record in database
  await db('document_translations').insert({
    id: translatedDocId,
    document_id: documentId,
    source_language: sourceLanguage,
    target_language: targetLanguage,
    file_path: translatedFilePath,
    created_at: new Date(),
    status: 'completed'
  });
  
  // Extract plain text for side-by-side view
  const plainTextTranslation = translatedPages.map(page => ({
    pageNumber: page.pageNumber,
    text: page.blocks.map(block => block.translatedText).join(' ')
  }));
  
  return {
    id: translatedDocId,
    originalDocumentId: documentId,
    sourceLanguage,
    targetLanguage,
    translatedPdfUrl: `/api/v1/documents/translations/${translatedDocId}/download`,
    plainText: plainTextTranslation
  };
};

/**
 * Get a translated document by ID
 * @param {string} translationId - Translation ID
 * @returns {Promise<Object|null>} - Translation record or null
 */
const getTranslation = async (translationId) => {
  const translation = await db('document_translations')
    .where('id', translationId)
    .first();
  
  return translation || null;
};

/**
 * Get all translations for a document
 * @param {string} documentId - Document ID
 * @returns {Promise<Array>} - Array of translation records
 */
const getDocumentTranslations = async (documentId) => {
  const translations = await db('document_translations')
    .where('document_id', documentId)
    .orderBy('created_at', 'desc');
  
  return translations;
};

module.exports = {
  translateDocument,
  getTranslation,
  getDocumentTranslations
};
