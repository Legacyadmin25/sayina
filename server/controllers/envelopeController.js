const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/db');
const { ApiError } = require('../middleware/errorMiddleware');
const { redisClient } = require('../config/redis');

/**
 * @desc    Create a new envelope
 * @route   POST /api/v1/envelopes
 * @access  Private
 */
const createEnvelope = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { name, message, expiry_days } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check organization subscription limits
    const orgData = await db('organizations')
      .join('subscriptions', 'organizations.id', 'subscriptions.org_id')
      .join('plans', 'subscriptions.plan_id', 'plans.id')
      .where('organizations.id', orgId)
      .select('plans.envelope_limit')
      .first();

    if (!orgData) {
      throw new ApiError(404, 'Organization or subscription not found');
    }

    // Count envelopes created this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const envelopeCount = await db('envelopes')
      .where('org_id', orgId)
      .where('created_at', '>=', startOfMonth)
      .count('id as count')
      .first();

    if (envelopeCount.count >= orgData.envelope_limit) {
      throw new ApiError(403, 'Monthly envelope limit reached for your subscription tier');
    }

    // Create envelope
    const _envelopeIdResult = await db('envelopes').insert({
      id: uuidv4(),
      name,
      message: message || null,
      expiry_days: expiry_days || 30,
      status: 'draft',
      org_id: orgId,
      created_by: userId,
    }).returning('id');
    const envelopeId = _envelopeIdResult[0]?.id ?? _envelopeIdResult[0];

    // Log event
    await db('events').insert({
      envelope_id: envelopeId,
      user_id: userId,
      action: 'envelope_created',
      metadata: JSON.stringify({
        envelope_name: name,
        expiry_days: expiry_days || 30
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Get the created envelope
    const envelope = await db('envelopes')
      .where({ id: envelopeId })
      .first();

    res.status(201).json({
      success: true,
      message: 'Envelope created successfully',
      data: { envelope }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all envelopes for organization
 * @route   GET /api/v1/envelopes
 * @access  Private
 */
const getEnvelopes = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const orgId = req.user.org_id;
    const { status, page = 1, limit = 10 } = req.query;

    // Build query
    const query = db('envelopes')
      .where('org_id', orgId)
      .orderBy('created_at', 'desc');

    // Filter by status if provided
    if (status) {
      query.where('status', status);
    }

    // Count total
    const totalQuery = db('envelopes')
      .where('org_id', orgId)
      .count('id as count')
      .first();

    if (status) {
      totalQuery.where('status', status);
    }

    const total = await totalQuery;

    // Paginate
    const offset = (page - 1) * limit;
    query.offset(offset).limit(limit);

    // Get envelopes
    const envelopes = await query;

    // Get document counts for each envelope
    const envelopeIds = envelopes.map(env => env.id);
    const documentCounts = await db('documents')
      .whereIn('envelope_id', envelopeIds)
      .select('envelope_id')
      .count('id as count')
      .groupBy('envelope_id');

    // Get signer counts for each envelope
    const signerCounts = await db('signers')
      .whereIn('envelope_id', envelopeIds)
      .select('envelope_id')
      .count('id as count')
      .groupBy('envelope_id');

    // Map counts to envelopes
    const mappedEnvelopes = envelopes.map(envelope => {
      const docCount = documentCounts.find(dc => dc.envelope_id === envelope.id);
      const signerCount = signerCounts.find(sc => sc.envelope_id === envelope.id);
      
      return {
        ...envelope,
        document_count: docCount ? parseInt(docCount.count) : 0,
        signer_count: signerCount ? parseInt(signerCount.count) : 0
      };
    });

    res.status(200).json({
      success: true,
      data: {
        envelopes: mappedEnvelopes,
        pagination: {
          total: parseInt(total.count),
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total.count / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get envelope by ID
 * @route   GET /api/v1/envelopes/:id
 * @access  Private
 */
const getEnvelopeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;

    // Get envelope
    const envelope = await db('envelopes')
      .where({ id, org_id: orgId })
      .first();

    if (!envelope) {
      throw new ApiError(404, 'Envelope not found');
    }

    // Get documents
    const documents = await db('documents')
      .where({ envelope_id: id })
      .select('id', 'name', 'file_type', 'file_size', 'page_count', 'created_at');

    // Get signers
    const signers = await db('signers')
      .where({ envelope_id: id })
      .select('id', 'email', 'first_name', 'last_name', 'order', 'status', 'created_at');

    // Get events
    const events = await db('events')
      .where({ envelope_id: id })
      .join('users', 'events.user_id', 'users.id')
      .select(
        'events.id',
        'events.action',
        'events.metadata',
        'events.created_at',
        'users.email as user_email',
        'users.first_name as user_first_name',
        'users.last_name as user_last_name'
      )
      .orderBy('events.created_at', 'desc')
      .limit(50);

    res.status(200).json({
      success: true,
      data: {
        envelope,
        documents,
        signers,
        events
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update envelope
 * @route   PUT /api/v1/envelopes/:id
 * @access  Private
 */
const updateEnvelope = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { id } = req.params;
    const { name, message, expiry_days } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if envelope exists and belongs to organization
    const envelope = await db('envelopes')
      .where({ id, org_id: orgId })
      .first();

    if (!envelope) {
      throw new ApiError(404, 'Envelope not found');
    }

    // Check if envelope is in draft status
    if (envelope.status !== 'draft') {
      throw new ApiError(400, 'Only envelopes in draft status can be updated');
    }

    // Update envelope
    await db('envelopes')
      .where({ id })
      .update({
        name: name || envelope.name,
        message: message !== undefined ? message : envelope.message,
        expiry_days: expiry_days || envelope.expiry_days,
        updated_at: db.fn.now()
      });

    // Log event
    await db('events').insert({
      envelope_id: id,
      user_id: userId,
      action: 'envelope_updated',
      metadata: JSON.stringify({
        envelope_name: name || envelope.name,
        expiry_days: expiry_days || envelope.expiry_days
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Get the updated envelope
    const updatedEnvelope = await db('envelopes')
      .where({ id })
      .first();

    res.status(200).json({
      success: true,
      message: 'Envelope updated successfully',
      data: { envelope: updatedEnvelope }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete envelope
 * @route   DELETE /api/v1/envelopes/:id
 * @access  Private
 */
const deleteEnvelope = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if envelope exists and belongs to organization
    const envelope = await db('envelopes')
      .where({ id, org_id: orgId })
      .first();

    if (!envelope) {
      throw new ApiError(404, 'Envelope not found');
    }

    // Check if envelope can be deleted (only draft or completed envelopes)
    if (!['draft', 'completed'].includes(envelope.status)) {
      throw new ApiError(400, 'Only draft or completed envelopes can be deleted');
    }

    // Start a transaction
    await db.transaction(async trx => {
      // Get documents to delete files later
      const documents = await trx('documents')
        .where({ envelope_id: id })
        .select('id', 'file_path');

      // Delete fields
      for (const doc of documents) {
        await trx('fields')
          .where({ document_id: doc.id })
          .delete();
      }

      // Delete signers
      await trx('signers')
        .where({ envelope_id: id })
        .delete();

      // Delete documents
      await trx('documents')
        .where({ envelope_id: id })
        .delete();

      // Delete events
      await trx('events')
        .where({ envelope_id: id })
        .delete();

      // Delete envelope
      await trx('envelopes')
        .where({ id })
        .delete();

      // Log event (outside of envelope events since envelope is deleted)
      await trx('system_logs').insert({
        user_id: userId,
        action: 'envelope_deleted',
        metadata: JSON.stringify({
          envelope_id: id,
          envelope_name: envelope.name,
          org_id: orgId
        }),
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
    });

    res.status(200).json({
      success: true,
      message: 'Envelope deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add signer to envelope
 * @route   POST /api/v1/envelopes/:id/signers
 * @access  Private
 */
const addSigner = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { id } = req.params;
    const { email, first_name, last_name, order } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if envelope exists and belongs to organization
    const envelope = await db('envelopes')
      .where({ id, org_id: orgId })
      .first();

    if (!envelope) {
      throw new ApiError(404, 'Envelope not found');
    }

    // Check if envelope is in draft status
    if (envelope.status !== 'draft') {
      throw new ApiError(400, 'Signers can only be added to envelopes in draft status');
    }

    // Check if signer with this email already exists for this envelope
    const existingSigner = await db('signers')
      .where({ envelope_id: id, email })
      .first();

    if (existingSigner) {
      throw new ApiError(400, 'A signer with this email already exists for this envelope');
    }

    // Get the highest order if not specified
    let signerOrder = order;
    if (!signerOrder) {
      const highestOrder = await db('signers')
        .where({ envelope_id: id })
        .max('order as max_order')
        .first();

      signerOrder = (highestOrder.max_order || 0) + 1;
    }

    // Create signer
    const _signerIdResult = await db('signers').insert({
      id: uuidv4(),
      envelope_id: id,
      email,
      first_name,
      last_name,
      order: signerOrder,
      status: 'pending'
    }).returning('id');
    const signerId = _signerIdResult[0]?.id ?? _signerIdResult[0];

    // Log event
    await db('events').insert({
      envelope_id: id,
      user_id: userId,
      action: 'signer_added',
      metadata: JSON.stringify({
        signer_id: signerId,
        signer_email: email,
        signer_name: `${first_name} ${last_name}`,
        signer_order: signerOrder
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Get the created signer
    const signer = await db('signers')
      .where({ id: signerId })
      .first();

    res.status(201).json({
      success: true,
      message: 'Signer added successfully',
      data: { signer }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove signer from envelope
 * @route   DELETE /api/v1/envelopes/:id/signers/:signerId
 * @access  Private
 */
const removeSigner = async (req, res, next) => {
  try {
    const { id, signerId } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if envelope exists and belongs to organization
    const envelope = await db('envelopes')
      .where({ id, org_id: orgId })
      .first();

    if (!envelope) {
      throw new ApiError(404, 'Envelope not found');
    }

    // Check if envelope is in draft status
    if (envelope.status !== 'draft') {
      throw new ApiError(400, 'Signers can only be removed from envelopes in draft status');
    }

    // Check if signer exists
    const signer = await db('signers')
      .where({ id: signerId, envelope_id: id })
      .first();

    if (!signer) {
      throw new ApiError(404, 'Signer not found');
    }

    // Start a transaction
    await db.transaction(async trx => {
      // Delete fields associated with this signer
      await trx('fields')
        .where({ signer_id: signerId })
        .delete();

      // Delete signer
      await trx('signers')
        .where({ id: signerId })
        .delete();

      // Log event
      await trx('events').insert({
        envelope_id: id,
        user_id: userId,
        action: 'signer_removed',
        metadata: JSON.stringify({
          signer_id: signerId,
          signer_email: signer.email,
          signer_name: `${signer.first_name} ${signer.last_name}`
        }),
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
    });

    res.status(200).json({
      success: true,
      message: 'Signer removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send envelope to signers
 * @route   POST /api/v1/envelopes/:id/send
 * @access  Private
 */
const sendEnvelope = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if envelope exists and belongs to organization
    const envelope = await db('envelopes')
      .where({ id, org_id: orgId })
      .first();

    if (!envelope) {
      throw new ApiError(404, 'Envelope not found');
    }

    // Check if envelope is in draft status
    if (envelope.status !== 'draft') {
      throw new ApiError(400, 'Only envelopes in draft status can be sent');
    }

    // Check if envelope has documents
    const documentCount = await db('documents')
      .where({ envelope_id: id })
      .count('id as count')
      .first();

    if (documentCount.count === 0) {
      throw new ApiError(400, 'Envelope must have at least one document to be sent');
    }

    // Check if envelope has signers
    const signerCount = await db('signers')
      .where({ envelope_id: id })
      .count('id as count')
      .first();

    if (signerCount.count === 0) {
      throw new ApiError(400, 'Envelope must have at least one signer to be sent');
    }

    // Check if all documents have fields
    const documents = await db('documents')
      .where({ envelope_id: id })
      .select('id');

    for (const doc of documents) {
      const fieldCount = await db('fields')
        .where({ document_id: doc.id })
        .count('id as count')
        .first();

      if (fieldCount.count === 0) {
        throw new ApiError(400, 'All documents must have at least one field to be signed');
      }
    }

    // Get organization's SMS credit balance
    const organization = await db('organizations')
      .where({ id: orgId })
      .select('sms_credits')
      .first();

    // Get signers to send notifications
    const signers = await db('signers')
      .where({ envelope_id: id })
      .orderBy('order', 'asc')
      .select('id', 'email', 'first_name', 'last_name', 'order');

    // Check if organization has enough SMS credits
    if (organization.sms_credits < signers.length) {
      throw new ApiError(400, 'Not enough SMS credits to send envelope. Please top up your SMS credits.');
    }

    // Generate signing URLs and access tokens for each signer
    const signingUrls = [];
    for (const signer of signers) {
      const accessToken = uuidv4();
      
      // Store token in Redis with expiry
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + envelope.expiry_days);
      
      await redisClient.set(
        `signing_token:${accessToken}`,
        JSON.stringify({
          envelope_id: id,
          signer_id: signer.id,
          expiry: expiryDate.toISOString()
        }),
        'EX',
        envelope.expiry_days * 24 * 60 * 60
      );

      signingUrls.push({
        signer_id: signer.id,
        signer_email: signer.email,
        signer_name: `${signer.first_name} ${signer.last_name}`,
        signing_url: `${process.env.CLIENT_URL}/sign/${accessToken}`
      });
    }

    // Update envelope status to 'sent'
    await db('envelopes')
      .where({ id })
      .update({
        status: 'sent',
        sent_at: db.fn.now(),
        updated_at: db.fn.now()
      });

    // Update first signer status to 'current'
    if (signers.length > 0) {
      await db('signers')
        .where({ id: signers[0].id })
        .update({
          status: 'current',
          updated_at: db.fn.now()
        });
    }

    // Deduct SMS credits
    await db('organizations')
      .where({ id: orgId })
      .decrement('sms_credits', signers.length);

    // Log SMS credit usage
    await db('sms_logs').insert({
      org_id: orgId,
      envelope_id: id,
      count: signers.length,
      action: 'envelope_sent',
      metadata: JSON.stringify({
        envelope_name: envelope.name,
        signer_count: signers.length
      })
    });

    // Log event
    await db('events').insert({
      envelope_id: id,
      user_id: userId,
      action: 'envelope_sent',
      metadata: JSON.stringify({
        signer_count: signers.length,
        expiry_days: envelope.expiry_days
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'Envelope sent successfully',
      data: {
        envelope_id: id,
        envelope_name: envelope.name,
        signing_urls: signingUrls
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel envelope
 * @route   POST /api/v1/envelopes/:id/cancel
 * @access  Private
 */
const cancelEnvelope = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if envelope exists and belongs to organization
    const envelope = await db('envelopes')
      .where({ id, org_id: orgId })
      .first();

    if (!envelope) {
      throw new ApiError(404, 'Envelope not found');
    }

    // Check if envelope is in sent or in_progress status
    if (!['sent', 'in_progress'].includes(envelope.status)) {
      throw new ApiError(400, 'Only envelopes in sent or in_progress status can be cancelled');
    }

    // Update envelope status to 'cancelled'
    await db('envelopes')
      .where({ id })
      .update({
        status: 'cancelled',
        updated_at: db.fn.now()
      });

    // Update all signers status to 'cancelled'
    await db('signers')
      .where({ envelope_id: id })
      .whereNot('status', 'completed')
      .update({
        status: 'cancelled',
        updated_at: db.fn.now()
      });

    // Log event
    await db('events').insert({
      envelope_id: id,
      user_id: userId,
      action: 'envelope_cancelled',
      metadata: JSON.stringify({
        envelope_name: envelope.name
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'Envelope cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get envelope signing status
 * @route   GET /api/v1/envelopes/:id/status
 * @access  Private
 */
const getEnvelopeStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;

    // Check if envelope exists and belongs to organization
    const envelope = await db('envelopes')
      .where({ id, org_id: orgId })
      .first();

    if (!envelope) {
      throw new ApiError(404, 'Envelope not found');
    }

    // Get signers with status
    const signers = await db('signers')
      .where({ envelope_id: id })
      .orderBy('order', 'asc')
      .select('id', 'email', 'first_name', 'last_name', 'order', 'status', 'completed_at');

    // Get signing events
    const events = await db('events')
      .where({ envelope_id: id })
      .whereIn('action', ['envelope_sent', 'document_signed', 'envelope_completed', 'envelope_cancelled'])
      .select('action', 'metadata', 'created_at')
      .orderBy('created_at', 'desc');

    res.status(200).json({
      success: true,
      data: {
        envelope: {
          id: envelope.id,
          name: envelope.name,
          status: envelope.status,
          created_at: envelope.created_at,
          sent_at: envelope.sent_at,
          completed_at: envelope.completed_at
        },
        signers,
        events
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEnvelope,
  getEnvelopes,
  getEnvelopeById,
  updateEnvelope,
  deleteEnvelope,
  addSigner,
  removeSigner,
  sendEnvelope,
  cancelEnvelope,
  getEnvelopeStatus
};
