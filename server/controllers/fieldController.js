const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/db');
const { ApiError } = require('../middleware/errorMiddleware');
const { getEnvelopePdfMetadata, validateFieldPlacement } = require('../utils/documentValidationHelper');
const { recordAuditEvent } = require('../utils/auditTrailHelper');
const { validateComplianceConsent, recordComplianceConsent } = require('../utils/complianceHelper');
const emailConfirmationService = require('../services/emailConfirmationService');
const logger = require('../config/winston');

/**
 * @desc    Add field to document
 * @route   POST /api/v1/fields
 * @access  Private
 */
const addField = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { 
      document_id, 
      envelope_id, 
      signer_id, 
      type, 
      page, 
      x_position, 
      y_position, 
      width, 
      height, 
      required,
      label,
      value,
      font_size,
      font_family,
      validation_pattern,
      validation_message
    } = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if document exists and belongs to the organization
    const document = await db('documents')
      .join('envelopes', 'documents.envelope_id', 'envelopes.id')
      .where('documents.id', document_id)
      .where('envelopes.org_id', orgId)
      .first();

    if (!document) {
      return next(new ApiError(404, 'Document not found or does not belong to your organization'));
    }

    // Check if envelope exists and belongs to the organization
    const envelope = await db('envelopes')
      .where('id', envelope_id)
      .where('org_id', orgId)
      .first();

    if (!envelope) {
      return next(new ApiError(404, 'Envelope not found or does not belong to your organization'));
    }

    // Check if envelope is in draft status
    if (envelope.status !== 'draft') {
      return next(new ApiError(400, 'Cannot add fields to an envelope that has already been sent'));
    }

    // If signer_id is provided, check if signer exists and belongs to the envelope
    if (signer_id) {
      const signer = await db('signers')
        .where('id', signer_id)
        .where('envelope_id', envelope_id)
        .first();

      if (!signer) {
        return next(new ApiError(404, 'Signer not found or does not belong to this envelope'));
      }
    }

    // Validate field type
    const validFieldTypes = [
      'signature', 'initial', 'date', 'text', 'checkbox', 
      'dropdown', 'radio', 'attachment', 'payment', 'name', 
      'email', 'company', 'title'
    ];
    
    if (!validFieldTypes.includes(type)) {
      return next(new ApiError(400, `Invalid field type. Must be one of: ${validFieldTypes.join(', ')}`));
    }
    
    // Check if user has appropriate role for field placement
    if (req.user.role === 'signer' || (req.apiKey && req.apiKey.type === 'temporary')) {
      return next(new ApiError(403, 'Only users with builder role or permanent API keys can place fields'));
    }
    
    // Get envelope PDF metadata for validation
    const pdfMetadata = await getEnvelopePdfMetadata(envelope_id);
    
    // Validate field placement within document boundaries
    const fieldData = {
      type,
      page,
      x: x_position,
      y: y_position,
      width,
      height
    };
    
    const validationResult = validateFieldPlacement(fieldData, pdfMetadata.pageSizes);
    
    if (!validationResult.valid) {
      return next(new ApiError(400, validationResult.message));
    }

    // Create field
    const [fieldId] = await db('fields').insert({
      id: uuidv4(),
      document_id,
      envelope_id,
      signer_id: signer_id || null,
      type,
      page,
      x_position,
      y_position,
      width,
      height,
      required: required !== undefined ? required : true,
      label: label || null,
      value: value || null,
      font_size: font_size || 12,
      font_family: font_family || 'Arial',
      validation_pattern: validation_pattern || null,
      validation_message: validation_message || null,
      created_by: userId
    }).returning('id');

    // Log event to system logs
    await db('system_logs').insert({
      user_id: userId,
      action: 'field_added',
      metadata: JSON.stringify({
        field_id: fieldId,
        document_id,
        envelope_id,
        signer_id: signer_id || null,
        field_type: type,
        position: { x: x_position, y: y_position, width, height, page }
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    // Record audit event for field addition
    await recordAuditEvent({
      envelope_id,
      user_id: userId,
      action: 'field_added',
      metadata: {
        field_id: fieldId,
        document_id,
        field_type: type,
        signer_id: signer_id || null
      }
    });

    // Get the created field
    const field = await db('fields')
      .where('id', fieldId)
      .first();

    res.status(201).json({
      success: true,
      message: 'Field added successfully',
      data: { field }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update field
 * @route   PUT /api/v1/fields/:id
 * @access  Private
 */
const updateField = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { id } = req.params;
    const { 
      signer_id, 
      x_position, 
      y_position, 
      width, 
      height, 
      required,
      label,
      value,
      font_size,
      font_family,
      validation_pattern,
      validation_message
    } = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if field exists and belongs to the organization
    const field = await db('fields')
      .join('envelopes', 'fields.envelope_id', 'envelopes.id')
      .where('fields.id', id)
      .where('envelopes.org_id', orgId)
      .select('fields.*', 'envelopes.status as envelope_status')
      .first();

    if (!field) {
      return next(new ApiError(404, 'Field not found or does not belong to your organization'));
    }

    // Check if envelope is in draft status
    if (field.envelope_status !== 'draft') {
      return next(new ApiError(400, 'Cannot update fields in an envelope that has already been sent'));
    }

    // If signer_id is provided, check if signer exists and belongs to the envelope
    if (signer_id && signer_id !== field.signer_id) {
      const signer = await db('signers')
        .where('id', signer_id)
        .where('envelope_id', field.envelope_id)
        .first();

      if (!signer) {
        return next(new ApiError(404, 'Signer not found or does not belong to this envelope'));
      }
    }
    
    // Check if user has appropriate role for field updates
    if (req.user.role === 'signer' || (req.apiKey && req.apiKey.type === 'temporary')) {
      return next(new ApiError(403, 'Only users with builder role or permanent API keys can update fields'));
    }
    
    // If position or size is being updated, validate field placement
    if (x_position !== undefined || y_position !== undefined || width !== undefined || height !== undefined) {
      // Get envelope PDF metadata for validation
      const pdfMetadata = await getEnvelopePdfMetadata(field.envelope_id);
      
      // Create field data object with updated or existing values
      const fieldData = {
        type: field.type,
        page: field.page,
        x: x_position !== undefined ? x_position : field.x_position,
        y: y_position !== undefined ? y_position : field.y_position,
        width: width !== undefined ? width : field.width,
        height: height !== undefined ? height : field.height
      };
      
      // Validate field placement within document boundaries
      const validationResult = validateFieldPlacement(fieldData, pdfMetadata.pageSizes);
      
      if (!validationResult.valid) {
        return next(new ApiError(400, validationResult.message));
      }
    }

    // Update field
    await db('fields')
      .where('id', id)
      .update({
        signer_id: signer_id !== undefined ? signer_id : field.signer_id,
        x_position: x_position !== undefined ? x_position : field.x_position,
        y_position: y_position !== undefined ? y_position : field.y_position,
        width: width !== undefined ? width : field.width,
        height: height !== undefined ? height : field.height,
        required: required !== undefined ? required : field.required,
        label: label !== undefined ? label : field.label,
        value: value !== undefined ? value : field.value,
        font_size: font_size !== undefined ? font_size : field.font_size,
        font_family: font_family !== undefined ? font_family : field.font_family,
        validation_pattern: validation_pattern !== undefined ? validation_pattern : field.validation_pattern,
        validation_message: validation_message !== undefined ? validation_message : field.validation_message,
        updated_at: db.fn.now()
      });

    // Log event
    await db('system_logs').insert({
      user_id: userId,
      action: 'field_updated',
      metadata: JSON.stringify({
        field_id: id,
        document_id: field.document_id,
        envelope_id: field.envelope_id
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Get the updated field
    const updatedField = await db('fields')
      .where('id', id)
      .first();

    res.status(200).json({
      success: true,
      message: 'Field updated successfully',
      data: { field: updatedField }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete field
 * @route   DELETE /api/v1/fields/:id
 * @access  Private
 */
const deleteField = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if field exists and belongs to the organization
    const field = await db('fields')
      .join('envelopes', 'fields.envelope_id', 'envelopes.id')
      .where('fields.id', id)
      .where('envelopes.org_id', orgId)
      .select('fields.*', 'envelopes.status as envelope_status')
      .first();

    if (!field) {
      return next(new ApiError(404, 'Field not found or does not belong to your organization'));
    }

    // Check if envelope is in draft status
    if (field.envelope_status !== 'draft') {
      return next(new ApiError(400, 'Cannot delete fields from an envelope that has already been sent'));
    }

    // Delete field
    await db('fields')
      .where('id', id)
      .del();

    // Log event
    await db('system_logs').insert({
      user_id: userId,
      action: 'field_deleted',
      metadata: JSON.stringify({
        field_id: id,
        document_id: field.document_id,
        envelope_id: field.envelope_id,
        field_type: field.type
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'Field deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get fields for document
 * @route   GET /api/v1/fields/document/:documentId
 * @access  Private
 */
const getDocumentFields = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const orgId = req.user.org_id;

    // Check if document exists and belongs to the organization
    const document = await db('documents')
      .join('envelopes', 'documents.envelope_id', 'envelopes.id')
      .where('documents.id', documentId)
      .where('envelopes.org_id', orgId)
      .first();

    if (!document) {
      return next(new ApiError(404, 'Document not found or does not belong to your organization'));
    }

    // Get fields
    const fields = await db('fields')
      .where('document_id', documentId)
      .orderBy('created_at', 'asc');

    // Get signers for the envelope
    const signers = await db('signers')
      .where('envelope_id', document.envelope_id)
      .select('id', 'name', 'email', 'role', 'signing_order')
      .orderBy('signing_order', 'asc');

    res.status(200).json({
      success: true,
      data: {
        fields,
        signers
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get fields for signer in document
 * @route   GET /api/v1/fields/document/:documentId/signer/:signerId
 * @access  Private
 */
const getSignerFields = async (req, res, next) => {
  try {
    const { documentId, signerId } = req.params;
    const orgId = req.user.org_id;

    // Check if document exists and belongs to the organization
    const document = await db('documents')
      .join('envelopes', 'documents.envelope_id', 'envelopes.id')
      .where('documents.id', documentId)
      .where('envelopes.org_id', orgId)
      .first();

    if (!document) {
      return next(new ApiError(404, 'Document not found or does not belong to your organization'));
    }

    // Check if signer exists and belongs to the envelope
    const signer = await db('signers')
      .where('id', signerId)
      .where('envelope_id', document.envelope_id)
      .first();

    if (!signer) {
      return next(new ApiError(404, 'Signer not found or does not belong to this envelope'));
    }

    // Get fields for signer
    const fields = await db('fields')
      .where('document_id', documentId)
      .where('signer_id', signerId)
      .orderBy('created_at', 'asc');

    res.status(200).json({
      success: true,
      data: {
        fields,
        signer: {
          id: signer.id,
          name: signer.name,
          email: signer.email,
          role: signer.role,
          signing_order: signer.signing_order
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit field values
 * @route   POST /api/v1/fields/submit
 * @access  Private (with API key or temporary key validation)
 */
const submitFieldValues = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { envelope_id, signer_id, fields, complianceGiven, complianceAt } = req.body;
    
    // Validate compliance consent
    const complianceValidation = validateComplianceConsent({
      complianceGiven,
      complianceAt,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    if (!complianceValidation.valid) {
      return next(new ApiError(400, complianceValidation.message));
    }

    // Check if envelope exists
    const envelope = await db('envelopes')
      .where('id', envelope_id)
      .first();

    if (!envelope) {
      return next(new ApiError(404, 'Envelope not found'));
    }

    // Check if envelope is in sent or partially signed status
    if (!['sent', 'partially_signed'].includes(envelope.status)) {
      return next(new ApiError(400, 'Envelope is not available for signing'));
    }

    // Check if signer exists and belongs to the envelope
    const signer = await db('signers')
      .where('id', signer_id)
      .where('envelope_id', envelope_id)
      .first();

    if (!signer) {
      return next(new ApiError(404, 'Signer not found or does not belong to this envelope'));
    }
    
    // Validate that the API key is authorized for this signer
    if (req.apiKey) {
      // Check if using a temporary key
      if (req.apiKey.type === 'temporary') {
        // Verify the temporary key is for this envelope and signer
        if (req.apiKey.envelope_id !== envelope_id) {
          return next(new ApiError(403, 'This temporary key is not valid for this envelope'));
        }
        
        // If the temporary key specifies a signer, verify it matches
        if (req.apiKey.signer_id && req.apiKey.signer_id !== signer_id) {
          return next(new ApiError(403, 'This temporary key is not valid for this signer'));
        }
      } else {
        // For permanent API keys, check organization access
        if (req.apiKey.org_id !== envelope.org_id) {
          return next(new ApiError(403, 'You do not have permission to access this envelope'));
        }
      }
    } else if (req.user) {
      // If using user authentication, check organization access
      if (req.user.org_id !== envelope.org_id && req.user.role !== 'admin') {
        return next(new ApiError(403, 'You do not have permission to access this envelope'));
      }
    } else {
      return next(new ApiError(401, 'Authentication required'));
    }

    // Check if signer has already signed
    if (signer.status === 'signed') {
      return next(new ApiError(400, 'You have already signed this document'));
    }

    // Check if it's this signer's turn to sign
    const currentSigningOrder = await db('signers')
      .where('envelope_id', envelope_id)
      .where('status', 'signed')
      .max('signing_order as max_order')
      .first();

    const nextSigningOrder = (currentSigningOrder.max_order || 0) + 1;

    if (signer.signing_order > nextSigningOrder) {
      return next(new ApiError(400, 'It is not your turn to sign yet'));
    }

    // Validate fields
    if (!Array.isArray(fields) || fields.length === 0) {
      return next(new ApiError(400, 'Fields must be a non-empty array'));
    }
    
    // Get all fields assigned to this signer
    const assignedFields = await db('fields')
      .where('envelope_id', envelope_id)
      .where('signer_id', signer_id)
      .select('id', 'required');
    
    if (assignedFields.length === 0) {
      return next(new ApiError(400, 'No fields are assigned to this signer'));
    }
    
    // Create a set of assigned field IDs for efficient lookup
    const assignedFieldIds = new Set(assignedFields.map(field => field.id));
    
    // Check if all submitted fields belong to this signer
    for (const field of fields) {
      if (!assignedFieldIds.has(field.id)) {
        return next(new ApiError(403, `Field ${field.id} is not assigned to this signer`));
      }
    }
    
    // Get all required fields for this signer
    const requiredFields = assignedFields.filter(field => field.required);
    const requiredFieldIds = requiredFields.map(field => field.id);
    const submittedFieldIds = fields.map(field => field.id);
    
    // Check if all required fields are submitted
    const missingRequiredFields = requiredFieldIds.filter(id => !submittedFieldIds.includes(id));
    if (missingRequiredFields.length > 0) {
      return next(new ApiError(400, `All required fields must be completed. Missing fields: ${missingRequiredFields.join(', ')}`));
    }

    // Begin transaction
    await db.transaction(async trx => {
      // Update field values
      for (const field of fields) {
        // Check if field exists and belongs to the signer
        const existingField = await trx('fields')
          .where('id', field.id)
          .where('envelope_id', envelope_id)
          .where('signer_id', signer_id)
          .first();

        if (!existingField) {
          throw new ApiError(404, `Field ${field.id} not found or does not belong to this signer`);
        }

        // Update field value
        await trx('fields')
          .where('id', field.id)
          .update({
            value: field.value,
            completed_at: trx.fn.now(),
            updated_at: trx.fn.now()
          });
      }

      // Record compliance consent
      await recordComplianceConsent(signer_id, {
        complianceGiven,
        complianceAt,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      // Update signer status
      await trx('signers')
        .where('id', signer_id)
        .update({
          status: 'signed',
          signed_at: trx.fn.now(),
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
          updated_at: trx.fn.now()
        });

      // Check if all signers have signed
      const remainingSigners = await trx('signers')
        .where('envelope_id', envelope_id)
        .where('status', '!=', 'signed')
        .count('id as count')
        .first();

      // Update envelope status
      if (parseInt(remainingSigners.count) === 0) {
        await trx('envelopes')
          .where('id', envelope_id)
          .update({
            status: 'completed',
            completed_at: trx.fn.now(),
            updated_at: trx.fn.now()
          });
          
        // Send confirmation emails to all participants after envelope is completed
        try {
          // We don't await this to avoid holding up the transaction
          // It will run asynchronously after the transaction commits
          emailConfirmationService.sendAllConfirmationEmails(envelope_id)
            .then(() => {
              logger.info(`Automatically sent confirmation emails for completed envelope ${envelope_id}`);
            })
            .catch(error => {
              logger.error(`Error sending automatic confirmation emails: ${error.message}`, { envelopeId: envelope_id, error });
            });
        } catch (error) {
          // Log error but don't fail the transaction if email sending fails
          logger.error(`Error initiating automatic confirmation emails: ${error.message}`, { envelopeId: envelope_id, error });
        }
      } else {
        await trx('envelopes')
          .where('id', envelope_id)
          .update({
            status: 'partially_signed',
            updated_at: trx.fn.now()
          });
      }
      
      // Log the signing event to audit trail
      await recordAuditEvent({
        envelope_id,
        signer_id,
        action: 'document_signed',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        compliance_given_at: new Date(complianceAt),
        compliance_via: 'ECT Act 25/2002; POPIA consent',
        compliance_given: true,
        metadata: {
          field_count: fields.length,
          signature_type: req.apiKey ? (req.apiKey.type === 'temporary' ? 'temp_key' : 'api_key') : 'user_session',
          compliance_timestamp: complianceAt
        }
      });
      
      // If using a temporary key and it's a signing action, mark it as used
      if (req.apiKey && req.apiKey.type === 'temporary') {
        // We don't need to await this as it's already handled in the middleware
        // This is just a backup in case it wasn't properly marked
        const tempKeyId = req.apiKey.id;
        trx('temporary_keys')
          .where('id', tempKeyId)
          .update({
            used: true,
            updated_at: trx.fn.now()
          })
          .catch(console.error); // Log but don't fail the transaction
      }

      // Log event
      await trx('system_logs').insert({
        action: 'document_signed',
        metadata: JSON.stringify({
          envelope_id,
          signer_id,
          signer_name: signer.name,
          signer_email: signer.email,
          fields_completed: fields.length
        }),
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
    });

    res.status(200).json({
      success: true,
      message: 'Fields submitted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addField,
  updateField,
  deleteField,
  getDocumentFields,
  getSignerFields,
  submitFieldValues
};
