const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { db } = require('../config/db');
const { ApiError } = require('../middleware/errorMiddleware');
const { sendSigningInvitation } = require('../services/emailService');
const { generateSigningUrl } = require('../services/documentService');

/**
 * @desc    Add signer to envelope
 * @route   POST /api/v1/signers
 * @access  Private
 */
const addSigner = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { envelope_id, name, email, phone, role, signing_order, message } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;

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
      return next(new ApiError(400, 'Cannot add signers to an envelope that has already been sent'));
    }

    // Check if signer with same email already exists in this envelope
    const existingSigner = await db('signers')
      .where('envelope_id', envelope_id)
      .where('email', email)
      .first();

    if (existingSigner) {
      return next(new ApiError(400, 'A signer with this email already exists in this envelope'));
    }

    // Validate role
    const validRoles = ['signer', 'approver', 'viewer', 'cc'];
    if (!validRoles.includes(role)) {
      return next(new ApiError(400, `Invalid role. Must be one of: ${validRoles.join(', ')}`));
    }

    // Generate access token
    const accessToken = crypto.randomBytes(32).toString('hex');

    // Create signer
    const _signerIdResult = await db('signers').insert({
      id: uuidv4(),
      envelope_id,
      name,
      email,
      phone: phone || null,
      role,
      signing_order: signing_order || 1,
      status: 'pending',
      message: message || null,
      access_token: accessToken,
      created_by: userId
    }).returning('id');
    const signerId = _signerIdResult[0]?.id ?? _signerIdResult[0];

    // Log event
    await db('system_logs').insert({
      user_id: userId,
      action: 'signer_added',
      metadata: JSON.stringify({
        signer_id: signerId,
        envelope_id,
        signer_name: name,
        signer_email: email,
        signer_role: role
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Get the created signer
    const signer = await db('signers')
      .where('id', signerId)
      .first();

    res.status(201).json({
      success: true,
      message: 'Signer added successfully',
      data: { 
        signer: {
          id: signer.id,
          name: signer.name,
          email: signer.email,
          phone: signer.phone,
          role: signer.role,
          signing_order: signer.signing_order,
          status: signer.status,
          message: signer.message
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update signer
 * @route   PUT /api/v1/signers/:id
 * @access  Private
 */
const updateSigner = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { id } = req.params;
    const { name, email, phone, role, signing_order, message } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if signer exists and belongs to the organization
    const signer = await db('signers')
      .join('envelopes', 'signers.envelope_id', 'envelopes.id')
      .where('signers.id', id)
      .where('envelopes.org_id', orgId)
      .select('signers.*', 'envelopes.status as envelope_status')
      .first();

    if (!signer) {
      return next(new ApiError(404, 'Signer not found or does not belong to your organization'));
    }

    // Check if envelope is in draft status
    if (signer.envelope_status !== 'draft') {
      return next(new ApiError(400, 'Cannot update signers in an envelope that has already been sent'));
    }

    // If email is being changed, check if another signer with same email already exists in this envelope
    if (email && email !== signer.email) {
      const existingSigner = await db('signers')
        .where('envelope_id', signer.envelope_id)
        .where('email', email)
        .whereNot('id', id)
        .first();

      if (existingSigner) {
        return next(new ApiError(400, 'Another signer with this email already exists in this envelope'));
      }
    }

    // Validate role if provided
    if (role) {
      const validRoles = ['signer', 'approver', 'viewer', 'cc'];
      if (!validRoles.includes(role)) {
        return next(new ApiError(400, `Invalid role. Must be one of: ${validRoles.join(', ')}`));
      }
    }

    // Update signer
    await db('signers')
      .where('id', id)
      .update({
        name: name || signer.name,
        email: email || signer.email,
        phone: phone !== undefined ? phone : signer.phone,
        role: role || signer.role,
        signing_order: signing_order || signer.signing_order,
        message: message !== undefined ? message : signer.message,
        updated_at: db.fn.now()
      });

    // Log event
    await db('system_logs').insert({
      user_id: userId,
      action: 'signer_updated',
      metadata: JSON.stringify({
        signer_id: id,
        envelope_id: signer.envelope_id
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Get the updated signer
    const updatedSigner = await db('signers')
      .where('id', id)
      .first();

    res.status(200).json({
      success: true,
      message: 'Signer updated successfully',
      data: { 
        signer: {
          id: updatedSigner.id,
          name: updatedSigner.name,
          email: updatedSigner.email,
          phone: updatedSigner.phone,
          role: updatedSigner.role,
          signing_order: updatedSigner.signing_order,
          status: updatedSigner.status,
          message: updatedSigner.message
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete signer
 * @route   DELETE /api/v1/signers/:id
 * @access  Private
 */
const deleteSigner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if signer exists and belongs to the organization
    const signer = await db('signers')
      .join('envelopes', 'signers.envelope_id', 'envelopes.id')
      .where('signers.id', id)
      .where('envelopes.org_id', orgId)
      .select('signers.*', 'envelopes.status as envelope_status')
      .first();

    if (!signer) {
      return next(new ApiError(404, 'Signer not found or does not belong to your organization'));
    }

    // Check if envelope is in draft status
    if (signer.envelope_status !== 'draft') {
      return next(new ApiError(400, 'Cannot delete signers from an envelope that has already been sent'));
    }

    // Delete fields associated with this signer
    await db('fields')
      .where('signer_id', id)
      .del();

    // Delete signer
    await db('signers')
      .where('id', id)
      .del();

    // Log event
    await db('system_logs').insert({
      user_id: userId,
      action: 'signer_deleted',
      metadata: JSON.stringify({
        signer_id: id,
        envelope_id: signer.envelope_id,
        signer_name: signer.name,
        signer_email: signer.email
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'Signer deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get signers for envelope
 * @route   GET /api/v1/signers/envelope/:envelopeId
 * @access  Private
 */
const getEnvelopeSigners = async (req, res, next) => {
  try {
    const { envelopeId } = req.params;
    const orgId = req.user.org_id;

    // Check if envelope exists and belongs to the organization
    const envelope = await db('envelopes')
      .where('id', envelopeId)
      .where('org_id', orgId)
      .first();

    if (!envelope) {
      return next(new ApiError(404, 'Envelope not found or does not belong to your organization'));
    }

    // Get signers
    const signers = await db('signers')
      .where('envelope_id', envelopeId)
      .orderBy('signing_order', 'asc')
      .orderBy('created_at', 'asc');

    res.status(200).json({
      success: true,
      data: {
        signers: signers.map(signer => ({
          id: signer.id,
          name: signer.name,
          email: signer.email,
          phone: signer.phone,
          role: signer.role,
          signing_order: signer.signing_order,
          status: signer.status,
          message: signer.message,
          signed_at: signer.signed_at,
          created_at: signer.created_at
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send reminder to signer
 * @route   POST /api/v1/signers/:id/remind
 * @access  Private
 */
const sendReminder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { custom_message } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if signer exists and belongs to the organization
    const signer = await db('signers')
      .join('envelopes', 'signers.envelope_id', 'envelopes.id')
      .where('signers.id', id)
      .where('envelopes.org_id', orgId)
      .select(
        'signers.*', 
        'envelopes.id as envelope_id', 
        'envelopes.name as envelope_name', 
        'envelopes.status as envelope_status',
        'envelopes.message as envelope_message'
      )
      .first();

    if (!signer) {
      return next(new ApiError(404, 'Signer not found or does not belong to your organization'));
    }

    // Check if envelope is in sent or partially signed status
    if (!['sent', 'partially_signed'].includes(signer.envelope_status)) {
      return next(new ApiError(400, 'Cannot send reminder for an envelope that is not in sent or partially signed status'));
    }

    // Check if signer has already signed
    if (signer.status === 'signed') {
      return next(new ApiError(400, 'Cannot send reminder to a signer who has already signed'));
    }

    // Get organization details
    const organization = await db('organizations')
      .where('id', orgId)
      .select('name', 'email', 'logo_path')
      .first();

    // Get documents in the envelope
    const documents = await db('documents')
      .where('envelope_id', signer.envelope_id)
      .select('id', 'name', 'file_path')
      .orderBy('created_at', 'asc');

    // Generate signing URL
    const signingUrl = generateSigningUrl(signer.envelope_id, signer.id, signer.access_token);

    // Send reminder email
    await sendSigningInvitation(
      signer.email,
      signer.name,
      {
        envelope_name: signer.envelope_name,
        envelope_message: signer.envelope_message,
        custom_message: custom_message || null,
        documents: documents.map(doc => doc.name),
        signing_url: signingUrl,
        organization_name: organization.name,
        organization_logo: organization.logo_path,
        is_reminder: true
      }
    );

    // Log reminder
    await db('system_logs').insert({
      user_id: userId,
      action: 'reminder_sent',
      metadata: JSON.stringify({
        signer_id: id,
        envelope_id: signer.envelope_id,
        signer_name: signer.name,
        signer_email: signer.email
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Update reminder count and last reminder date
    await db('signers')
      .where('id', id)
      .update({
        reminder_count: db.raw('reminder_count + 1'),
        last_reminded_at: db.fn.now(),
        updated_at: db.fn.now()
      });

    res.status(200).json({
      success: true,
      message: 'Reminder sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get signing URL for signer
 * @route   GET /api/v1/signers/:id/signing-url
 * @access  Private
 */
const getSigningUrl = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if signer exists and belongs to the organization
    const signer = await db('signers')
      .join('envelopes', 'signers.envelope_id', 'envelopes.id')
      .where('signers.id', id)
      .where('envelopes.org_id', orgId)
      .select('signers.*', 'envelopes.status as envelope_status')
      .first();

    if (!signer) {
      return next(new ApiError(404, 'Signer not found or does not belong to your organization'));
    }

    // Generate signing URL
    const signingUrl = generateSigningUrl(signer.envelope_id, signer.id, signer.access_token);

    res.status(200).json({
      success: true,
      data: {
        signing_url: signingUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Validate signer access token
 * @route   GET /api/v1/signers/validate-token
 * @access  Public
 */
const validateToken = async (req, res, next) => {
  try {
    const { envelope_id, signer_id, token } = req.query;

    if (!envelope_id || !signer_id || !token) {
      return next(new ApiError(400, 'Missing required parameters'));
    }

    // Check if signer exists and token is valid
    const signer = await db('signers')
      .where('id', signer_id)
      .where('envelope_id', envelope_id)
      .where('access_token', token)
      .first();

    if (!signer) {
      return next(new ApiError(401, 'Invalid or expired signing link'));
    }

    // Check if envelope exists and is in valid status
    const envelope = await db('envelopes')
      .where('id', envelope_id)
      .first();

    if (!envelope) {
      return next(new ApiError(404, 'Envelope not found'));
    }

    // Check if envelope is in valid status for signing
    if (!['sent', 'partially_signed'].includes(envelope.status)) {
      return next(new ApiError(400, 'This envelope is not available for signing'));
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

    // Get documents in the envelope
    const documents = await db('documents')
      .where('envelope_id', envelope_id)
      .select('id', 'name', 'file_path')
      .orderBy('created_at', 'asc');

    // Get organization details
    const organization = await db('organizations')
      .join('envelopes', 'organizations.id', 'envelopes.org_id')
      .where('envelopes.id', envelope_id)
      .select('organizations.id', 'organizations.name', 'organizations.logo_path')
      .first();

    // Log access
    await db('system_logs').insert({
      action: 'signing_link_accessed',
      metadata: JSON.stringify({
        envelope_id,
        signer_id,
        signer_name: signer.name,
        signer_email: signer.email
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      data: {
        valid: true,
        signer: {
          id: signer.id,
          name: signer.name,
          email: signer.email,
          role: signer.role
        },
        envelope: {
          id: envelope.id,
          name: envelope.name,
          message: envelope.message,
          status: envelope.status
        },
        documents: documents.map(doc => ({
          id: doc.id,
          name: doc.name
        })),
        organization: {
          id: organization.id,
          name: organization.name,
          logo_path: organization.logo_path
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addSigner,
  updateSigner,
  deleteSigner,
  getEnvelopeSigners,
  sendReminder,
  getSigningUrl,
  validateToken
};
