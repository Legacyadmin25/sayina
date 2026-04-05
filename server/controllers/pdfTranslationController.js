/**
 * PDF Translation Controller
 * 
 * This controller handles PDF translation with OCR capabilities for the Sayina E-Signature platform.
 * It supports all 11 official South African languages.
 */

const { ApiError } = require('../middleware/errorMiddleware');
const pdfTranslationService = require('../services/pdfTranslationService');
const documentService = require('../services/documentService');
const { logSystemEvent } = require('../services/loggerService');

/**
 * @desc    Translate a PDF document using OCR
 * @route   POST /api/v1/documents/:id/translate
 * @access  Private
 */
const translatePdfDocument = async (req, res, next) => {
  try {
    const { id: documentId } = req.params;
    const { targetLanguage } = req.body;
    const userId = req.user.id;

    // Verify document exists and user has access
    const document = await documentService.getDocumentById(documentId, userId);
    if (!document) {
      return next(new ApiError(404, 'Document not found'));
    }

    // Get original document language
    const sourceLanguage = document.language || 'en';

    // Run OCR and translate the document
    const result = await pdfTranslationService.translateDocument(
      documentId,
      sourceLanguage,
      targetLanguage
    );

    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'document_translated',
      metadata: {
        document_id: documentId,
        source_language: sourceLanguage,
        target_language: targetLanguage
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  translatePdfDocument
};
