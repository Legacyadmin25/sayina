const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { PDFDocument, rgb } = require('pdf-lib');
const db_module = require('../config/db');
const { db } = db_module;
const { ApiError } = require('../middleware/errorMiddleware');

// Accepted MIME types for upload
const ACCEPTED_MIMETYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
];

/**
 * Convert image file to a single-page PDF using pdf-lib
 */
const imageToPdf = async (filePath, mimetype) => {
  const imageBuffer = fs.readFileSync(filePath);
  const pdfDoc = await PDFDocument.create();
  let image;
  if (mimetype === 'image/jpeg') {
    image = await pdfDoc.embedJpg(imageBuffer);
  } else {
    image = await pdfDoc.embedPng(imageBuffer);
  }
  const page = pdfDoc.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  return await pdfDoc.save();
};

/**
 * @desc    Upload document to envelope
 * @route   POST /api/v1/documents/upload/:envelopeId
 * @access  Private
 */
const uploadDocument = async (req, res, next) => {
  try {
    const { envelopeId } = req.params;
    const userId = req.user.id;
    const orgId = req.user.orgId ?? req.user.org_id;

    // Check if envelope exists and belongs to user's organization
    const envelope = await db('envelopes')
      .where({ id: envelopeId, org_id: orgId })
      .first();

    if (!envelope) {
      throw new ApiError(404, 'Envelope not found or does not belong to your organization');
    }

    // Check if envelope is in draft status
    if (envelope.status !== 'draft') {
      throw new ApiError(400, 'Documents can only be added to envelopes in draft status');
    }

    // Set up multer for file upload
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/documents');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${envelopeId}-${uniqueSuffix}${ext}`);
      }
    });

    const upload = multer({
      storage,
      limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB limit
      fileFilter: (req, file, cb) => {
        if (ACCEPTED_MIMETYPES.includes(file.mimetype)) {
          return cb(null, true);
        }
        cb(new Error('Unsupported file type. Please upload a PDF, Word document (.doc/.docx), or image (.jpg/.png).'));
      }
    }).single('document');

    // Handle upload
    upload(req, res, async (err) => {
      if (err) {
        return next(new ApiError(400, err.message));
      }

      if (!req.file) {
        return next(new ApiError(400, 'No file uploaded'));
      }

      try {
        let filePath = req.file.path;
        const originalName = req.file.originalname;
        const originalMimetype = req.file.mimetype;

        // ── Convert non-PDF files to PDF ──────────────────────────────────────
        let fileType = 'application/pdf';
        let fileName = originalName.replace(/\.(docx?|jpe?g|png)$/i, '.pdf');

        if (originalMimetype === 'image/jpeg' || originalMimetype === 'image/png') {
          // Convert image → PDF using pdf-lib
          const pdfBytes = await imageToPdf(filePath, originalMimetype);
          const pdfPath = filePath.replace(/\.(jpe?g|png)$/i, '.pdf');
          fs.writeFileSync(pdfPath, pdfBytes);
          fs.unlinkSync(filePath); // remove original image
          filePath = pdfPath;
        } else if (
          originalMimetype === 'application/msword' ||
          originalMimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
          // Word docs: attempt LibreOffice conversion (available on Railway Linux)
          // If LibreOffice isn't available, keep the file and note it in file_type
          try {
            const { execSync } = require('child_process');
            const uploadDir = path.dirname(filePath);
            execSync(`libreoffice --headless --convert-to pdf --outdir "${uploadDir}" "${filePath}"`, { timeout: 30000 });
            const pdfPath = filePath.replace(/\.docx?$/i, '.pdf');
            if (fs.existsSync(pdfPath)) {
              fs.unlinkSync(filePath);
              filePath = pdfPath;
            } else {
              // LibreOffice ran but no PDF — fall back to keeping original
              fileType = originalMimetype;
              fileName = originalName;
            }
          } catch {
            // LibreOffice not available — keep original, mark type
            fileType = originalMimetype;
            fileName = originalName;
          }
        } else {
          // Already a PDF
          fileName = originalName;
        }

        // Get file details post-conversion
        const fileBuffer = fs.readFileSync(filePath);
        const fileSize = fileBuffer.length;
        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        // Get page count (only possible for PDFs)
        let pageCount = 1;
        if (fileType === 'application/pdf') {
          try {
            const pdfDoc = await PDFDocument.load(fileBuffer);
            pageCount = pdfDoc.getPageCount();
          } catch { pageCount = 1; }
        }

        // Create document record in database
        const _documentIdResult = await db('documents').insert({
          id: uuidv4(),
          envelope_id: envelopeId,
          name: fileName,
          file_path: filePath,
          file_type: fileType,
          file_size: fileSize,
          sha256_hash: hash,
          page_count: pageCount,
        }).returning('id');
        const documentId = _documentIdResult[0]?.id ?? _documentIdResult[0];

        // Log event
        await db('events').insert({
          envelope_id: envelopeId,
          user_id: userId,
          action: 'document_uploaded',
          metadata: JSON.stringify({
            document_id: documentId,
            file_name: fileName,
            file_size: fileSize,
            page_count: pageCount
          }),
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        });

        // Get the created document
        const document = await db('documents')
          .where({ id: documentId })
          .first();

        res.status(201).json({
          success: true,
          message: 'Document uploaded successfully',
          data: {
            document: {
              id: document.id,
              name: document.name,
              file_type: document.file_type,
              file_size: document.file_size,
              page_count: document.page_count,
              created_at: document.created_at
            }
          }
        });
      } catch (error) {
        // Clean up the file if there was an error
        if (req.file && req.file.path) {
          fs.unlinkSync(req.file.path);
        }
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get document by ID
 * @route   GET /api/v1/documents/:id
 * @access  Private
 */
const getDocumentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;

    // Get document with envelope info to check organization
    const document = await db('documents')
      .join('envelopes', 'documents.envelope_id', 'envelopes.id')
      .where('documents.id', id)
      .select(
        'documents.*',
        'envelopes.org_id',
        'envelopes.status as envelope_status'
      )
      .first();

    if (!document) {
      throw new ApiError(404, 'Document not found');
    }

    // Check if document belongs to user's organization
    if (document.org_id !== orgId) {
      throw new ApiError(403, 'You do not have permission to access this document');
    }

    // Return document data (excluding file path for security)
    res.status(200).json({
      success: true,
      data: {
        document: {
          id: document.id,
          envelope_id: document.envelope_id,
          name: document.name,
          file_type: document.file_type,
          file_size: document.file_size,
          page_count: document.page_count,
          sha256_hash: document.sha256_hash,
          created_at: document.created_at,
          envelope_status: document.envelope_status
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get document preview
 * @route   GET /api/v1/documents/:id/preview
 * @access  Private
 */
const getDocumentPreview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;

    // Get document with envelope info to check organization
    const document = await db('documents')
      .join('envelopes', 'documents.envelope_id', 'envelopes.id')
      .where('documents.id', id)
      .select(
        'documents.*',
        'envelopes.org_id'
      )
      .first();

    if (!document) {
      throw new ApiError(404, 'Document not found');
    }

    // Check if document belongs to user's organization
    if (document.org_id !== orgId) {
      throw new ApiError(403, 'You do not have permission to access this document');
    }

    // Check if file exists
    if (!fs.existsSync(document.file_path)) {
      throw new ApiError(404, 'Document file not found');
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${document.name}"`);

    // Stream the file
    const fileStream = fs.createReadStream(document.file_path);
    fileStream.pipe(res);

    // Log event
    await db('events').insert({
      envelope_id: document.envelope_id,
      user_id: req.user.id,
      action: 'document_viewed',
      metadata: JSON.stringify({
        document_id: document.id,
        document_name: document.name
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download document
 * @route   GET /api/v1/documents/:id/download
 * @access  Private
 */
const downloadDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;

    // Get document with envelope info to check organization
    const document = await db('documents')
      .join('envelopes', 'documents.envelope_id', 'envelopes.id')
      .where('documents.id', id)
      .select(
        'documents.*',
        'envelopes.org_id'
      )
      .first();

    if (!document) {
      throw new ApiError(404, 'Document not found');
    }

    // Check if document belongs to user's organization
    if (document.org_id !== orgId) {
      throw new ApiError(403, 'You do not have permission to access this document');
    }

    // Check if file exists
    if (!fs.existsSync(document.file_path)) {
      throw new ApiError(404, 'Document file not found');
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${document.name}"`);

    // Stream the file
    const fileStream = fs.createReadStream(document.file_path);
    fileStream.pipe(res);

    // Log event
    await db('events').insert({
      envelope_id: document.envelope_id,
      user_id: req.user.id,
      action: 'document_downloaded',
      metadata: JSON.stringify({
        document_id: document.id,
        document_name: document.name
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete document
 * @route   DELETE /api/v1/documents/:id
 * @access  Private
 */
const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;

    // Get document with envelope info to check organization and status
    const document = await db('documents')
      .join('envelopes', 'documents.envelope_id', 'envelopes.id')
      .where('documents.id', id)
      .select(
        'documents.*',
        'envelopes.org_id',
        'envelopes.status as envelope_status'
      )
      .first();

    if (!document) {
      throw new ApiError(404, 'Document not found');
    }

    // Check if document belongs to user's organization
    if (document.org_id !== orgId) {
      throw new ApiError(403, 'You do not have permission to delete this document');
    }

    // Check if envelope is in draft status
    if (document.envelope_status !== 'draft') {
      throw new ApiError(400, 'Documents can only be deleted from envelopes in draft status');
    }

    // Delete document fields first
    await db('fields')
      .where({ document_id: id })
      .delete();

    // Delete document from database
    await db('documents')
      .where({ id })
      .delete();

    // Delete file from storage
    if (fs.existsSync(document.file_path)) {
      fs.unlinkSync(document.file_path);
    }

    // Log event
    await db('events').insert({
      envelope_id: document.envelope_id,
      user_id: req.user.id,
      action: 'document_deleted',
      metadata: JSON.stringify({
        document_id: document.id,
        document_name: document.name
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get document fields
 * @route   GET /api/v1/documents/:id/fields
 * @access  Private
 */
const getDocumentFields = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;

    // Get document with envelope info to check organization
    const document = await db('documents')
      .join('envelopes', 'documents.envelope_id', 'envelopes.id')
      .where('documents.id', id)
      .select(
        'documents.*',
        'envelopes.org_id'
      )
      .first();

    if (!document) {
      throw new ApiError(404, 'Document not found');
    }

    // Check if document belongs to user's organization
    if (document.org_id !== orgId) {
      throw new ApiError(403, 'You do not have permission to access this document');
    }

    // Get fields for the document
    const fields = await db('fields')
      .where({ document_id: id })
      .orderBy('created_at', 'asc');

    // Get signers for the envelope
    const signers = await db('signers')
      .where({ envelope_id: document.envelope_id })
      .select('id', 'email', 'first_name', 'last_name', 'order', 'status')
      .orderBy('order', 'asc');

    res.status(200).json({
      success: true,
      data: {
        document: {
          id: document.id,
          name: document.name,
          page_count: document.page_count
        },
        fields,
        signers
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get document with fields for signing
 * @route   GET /api/v1/documents/:id/signing/:signerId
 * @access  Private
 */
const getDocumentForSigning = async (req, res, next) => {
  try {
    const { id, signerId } = req.params;

    // Get document
    const document = await db('documents')
      .where({ id })
      .first();

    if (!document) {
      throw new ApiError(404, 'Document not found');
    }

    // Get signer to verify access
    const signer = await db('signers')
      .where({ 
        id: signerId,
        envelope_id: document.envelope_id
      })
      .first();

    if (!signer) {
      throw new ApiError(403, 'You do not have permission to access this document for signing');
    }

    // Get fields for the document that belong to this signer
    const fields = await db('fields')
      .where({ 
        document_id: id,
        signer_id: signerId
      })
      .orderBy('created_at', 'asc');

    // Check if file exists
    if (!fs.existsSync(document.file_path)) {
      throw new ApiError(404, 'Document file not found');
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${document.name}"`);

    // Stream the file
    const fileStream = fs.createReadStream(document.file_path);
    fileStream.pipe(res);

    // Log event
    await db('events').insert({
      envelope_id: document.envelope_id,
      user_id: null,
      action: 'document_viewed_for_signing',
      metadata: JSON.stringify({
        document_id: document.id,
        document_name: document.name,
        signer_id: signerId,
        signer_email: signer.email
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDocument,
  getDocumentById,
  getDocumentPreview,
  downloadDocument,
  deleteDocument,
  getDocumentFields,
  getDocumentForSigning
};
