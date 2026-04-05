/**
 * Signed Document Controller
 * 
 * This controller handles operations related to signed documents, including
 * downloading signed PDFs with compliance verification and accessing audit trails.
 */

const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/db');
const { ApiError } = require('../middleware/errorMiddleware');
const logger = require('../config/winston');
const { embedComplianceData } = require('../services/complianceService');

/**
 * @desc    Download signed document with compliance verification
 * @route   GET /api/v1/signed-documents/:envelopeId/download
 * @access  Private
 */
const downloadSignedDocument = async (req, res, next) => {
  try {
    const { envelopeId } = req.params;
    const userId = req.user?.id;
    const orgId = req.user?.org_id;

    // Get envelope with documents
    const envelope = await db('envelopes')
      .where('id', envelopeId)
      .first();

    if (!envelope) {
      throw new ApiError(404, 'Envelope not found');
    }

    // Check permissions - user must be either:
    // 1. From the organization that owns the envelope, or
    // 2. A signer of the envelope
    let hasPermission = false;
    
    if (userId && orgId === envelope.org_id) {
      // User is from the organization that owns the envelope
      hasPermission = true;
    } else {
      // Check if user is a signer
      const signer = await db('signers')
        .where('envelope_id', envelopeId)
        .where('email', req.user?.email)
        .first();
      
      if (signer) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      throw new ApiError(403, 'You do not have permission to access this document');
    }

    // Check if envelope is completed
    if (envelope.status !== 'completed') {
      throw new ApiError(400, 'This envelope has not been fully signed yet');
    }

    // Get all documents in the envelope
    const documents = await db('documents')
      .where('envelope_id', envelopeId)
      .orderBy('created_at');

    if (documents.length === 0) {
      throw new ApiError(404, 'No documents found in this envelope');
    }

    // Get compliance records for the envelope
    const complianceRecords = await db('compliance_records')
      .where('envelope_id', envelopeId)
      .join('signers', 'compliance_records.signer_id', 'signers.id')
      .select(
        'compliance_records.*',
        'signers.name as signer_name',
        'signers.email as signer_email'
      );

    // If we're here, the envelope is completed and has documents
    // For simplicity, we'll return the primary/first document with compliance data
    const primaryDocument = documents[0];
    const documentPath = primaryDocument.file_path;
    
    // Check if file exists
    if (!fs.existsSync(documentPath)) {
      throw new ApiError(404, 'Document file not found');
    }

    // Prepare compliance data
    const latestComplianceRecord = complianceRecords.length > 0 
      ? complianceRecords[complianceRecords.length - 1] 
      : null;

    if (!latestComplianceRecord) {
      throw new ApiError(404, 'Compliance record not found for this envelope');
    }

    const complianceData = {
      documentName: primaryDocument.name,
      signerName: latestComplianceRecord.signer_name,
      timestamp: latestComplianceRecord.timestamp,
      ipAddress: latestComplianceRecord.ip_address,
      envelopeId: envelopeId
    };

    // Create temporary directory for signed document if it doesn't exist
    const tempDir = path.join(__dirname, '../../uploads/signed');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Generate output path for signed document
    const outputFileName = `signed_${path.basename(documentPath)}`;
    const outputPath = path.join(tempDir, outputFileName);

    // Embed compliance data into document
    await embedComplianceData(documentPath, complianceData, outputPath);

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Signed_${primaryDocument.name}"`);

    // Stream the file
    const fileStream = fs.createReadStream(outputPath);
    fileStream.pipe(res);

    // Log event
    await db('events').insert({
      id: uuidv4(),
      envelope_id: envelopeId,
      user_id: userId || null,
      action: 'signed_document_downloaded',
      metadata: JSON.stringify({
        document_id: primaryDocument.id,
        document_name: primaryDocument.name
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      created_at: new Date().toISOString()
    });

    // Clean up temporary file
    fileStream.on('close', () => {
      fs.unlink(outputPath, (err) => {
        if (err) {
          logger.error(`Failed to delete temporary signed document: ${err.message}`);
        }
      });
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get envelope audit trail
 * @route   GET /api/v1/signed-documents/:envelopeId/audit
 * @access  Private
 */
const getEnvelopeAuditTrail = async (req, res, next) => {
  try {
    const { envelopeId } = req.params;
    const userId = req.user?.id;
    const orgId = req.user?.org_id;

    // Get envelope
    const envelope = await db('envelopes')
      .where('id', envelopeId)
      .first();

    if (!envelope) {
      throw new ApiError(404, 'Envelope not found');
    }

    // Check permissions - user must be either:
    // 1. From the organization that owns the envelope, or
    // 2. A signer of the envelope
    let hasPermission = false;
    
    if (userId && orgId === envelope.org_id) {
      // User is from the organization that owns the envelope
      hasPermission = true;
    } else {
      // Check if user is a signer
      const signer = await db('signers')
        .where('envelope_id', envelopeId)
        .where('email', req.user?.email)
        .first();
      
      if (signer) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      throw new ApiError(403, 'You do not have permission to access this audit trail');
    }

    // Get envelope details
    const envelopeDetails = await db('envelopes')
      .where('id', envelopeId)
      .join('users', 'envelopes.created_by', 'users.id')
      .join('organizations', 'envelopes.org_id', 'organizations.id')
      .select(
        'envelopes.*',
        'users.email as creator_email',
        'users.first_name as creator_first_name',
        'users.last_name as creator_last_name',
        'organizations.name as organization_name'
      )
      .first();

    // Get documents in the envelope
    const documents = await db('documents')
      .where('envelope_id', envelopeId)
      .select('id', 'name', 'created_at');

    // Get signers of the envelope
    const signers = await db('signers')
      .where('envelope_id', envelopeId)
      .select('id', 'name', 'email', 'status', 'signed_at', 'access_code', 'order');

    // Get all events for the envelope
    const events = await db('events')
      .where('envelope_id', envelopeId)
      .leftJoin('users', 'events.user_id', 'users.id')
      .select(
        'events.*',
        'users.email as user_email',
        'users.first_name as user_first_name',
        'users.last_name as user_last_name'
      )
      .orderBy('events.created_at', 'desc');

    // Get compliance records
    const complianceRecords = await db('compliance_records')
      .where('envelope_id', envelopeId)
      .join('signers', 'compliance_records.signer_id', 'signers.id')
      .select(
        'compliance_records.*',
        'signers.name as signer_name',
        'signers.email as signer_email'
      );

    // Format events with user information
    const formattedEvents = events.map(event => {
      const metadata = event.metadata ? JSON.parse(event.metadata) : {};
      return {
        id: event.id,
        action: event.action,
        timestamp: event.created_at,
        user: event.user_id ? {
          id: event.user_id,
          email: event.user_email,
          name: `${event.user_first_name || ''} ${event.user_last_name || ''}`.trim()
        } : null,
        ip_address: event.ip_address,
        user_agent: event.user_agent,
        metadata
      };
    });

    // Format compliance records
    const formattedComplianceRecords = complianceRecords.map(record => {
      return {
        id: record.id,
        signer: {
          id: record.signer_id,
          name: record.signer_name,
          email: record.signer_email
        },
        timestamp: record.timestamp,
        ip_address: record.ip_address,
        consent_text: record.consent_text
      };
    });

    res.status(200).json({
      success: true,
      data: {
        envelope: {
          id: envelopeDetails.id,
          name: envelopeDetails.name,
          status: envelopeDetails.status,
          created_at: envelopeDetails.created_at,
          completed_at: envelopeDetails.completed_at,
          creator: {
            email: envelopeDetails.creator_email,
            name: `${envelopeDetails.creator_first_name || ''} ${envelopeDetails.creator_last_name || ''}`.trim()
          },
          organization: {
            id: envelopeDetails.org_id,
            name: envelopeDetails.organization_name
          }
        },
        documents,
        signers,
        events: formattedEvents,
        compliance_records: formattedComplianceRecords
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  downloadSignedDocument,
  getEnvelopeAuditTrail
};
