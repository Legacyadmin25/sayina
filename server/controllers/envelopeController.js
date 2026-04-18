const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/db');
const { ApiError } = require('../middleware/errorMiddleware');
const { redisClient } = require('../config/redis');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { PDFDocument } = require('pdf-lib');
const axios = require('axios');

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
 * @desc    Add signer(s) to envelope
 * @route   POST /api/v1/envelopes/:id/signers
 * @access  Private
 *
 * Accepts two body shapes:
 *   Batch (from wizard): { signers: [{name, email, phone, role}, ...] }
 *   Single (legacy):     { email, first_name, last_name, phone, role, order }
 */
const addSigner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.orgId ?? req.user.org_id;

    // Verify envelope exists and belongs to this org
    const envelope = await db('envelopes').where({ id, org_id: orgId }).first();
    if (!envelope) throw new ApiError(404, 'Envelope not found');
    if (envelope.status !== 'draft') throw new ApiError(400, 'Signers can only be added to envelopes in draft status');

    // ── Normalise incoming data into a flat array of signer records ──────────
    let signerList = [];

    if (Array.isArray(req.body.signers)) {
      // Batch form: { signers: [{name, email, phone, role}] }
      signerList = req.body.signers.map((s, idx) => {
        const nameParts = (s.name || '').trim().split(/\s+/);
        const first_name = nameParts[0] || 'Unknown';
        const last_name  = nameParts.slice(1).join(' ') || '';
        return {
          email:      (s.email || '').trim().toLowerCase(),
          first_name,
          last_name,
          phone:      s.phone || null,
          role:       ['signer', 'approver', 'cc', 'viewer'].includes(s.role) ? s.role : 'signer',
          order:      idx + 1,
        };
      });
    } else {
      // Single form (legacy / direct API)
      const errors = validationResult(req);
      if (!errors.isEmpty()) return next(new ApiError(400, 'Validation error', errors.array()));
      const { email, first_name, last_name, phone, role, order } = req.body;
      const highestOrder = await db('signers').where({ envelope_id: id }).max('order as max_order').first();
      signerList = [{
        email: (email || '').trim().toLowerCase(),
        first_name,
        last_name,
        phone: phone || null,
        role: ['signer', 'approver', 'cc', 'viewer'].includes(role) ? role : 'signer',
        order: order || (highestOrder?.max_order || 0) + 1,
      }];
    }

    if (signerList.length === 0) throw new ApiError(400, 'At least one signer is required');

    // ── Insert each signer ───────────────────────────────────────────────────
    const createdSigners = [];

    for (const s of signerList) {
      if (!s.email || !/\S+@\S+\.\S+/.test(s.email)) continue; // skip invalid

      // Skip duplicates silently
      const exists = await db('signers').where({ envelope_id: id, email: s.email }).first();
      if (exists) { createdSigners.push(exists); continue; }

      const newId = uuidv4();
      await db('signers').insert({
        id:          newId,
        envelope_id: id,
        email:       s.email,
        first_name:  s.first_name,
        last_name:   s.last_name,
        phone:       s.phone,
        role:        s.role,
        order:       s.order,
        status:      'pending',
      });

      await db('events').insert({
        envelope_id: id,
        user_id:     userId,
        action:      'signer_added',
        metadata:    JSON.stringify({
          signer_id:    newId,
          signer_email: s.email,
          signer_name:  `${s.first_name} ${s.last_name}`.trim(),
          signer_role:  s.role,
          signer_order: s.order,
        }),
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      });

      const created = await db('signers').where({ id: newId }).first();
      createdSigners.push(created);
    }

    res.status(201).json({
      success: true,
      message: `${createdSigners.length} signer(s) added successfully`,
      data: { signers: createdSigners },
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

/**
 * @desc    One-shot wizard: create envelope + upload doc + add signers + add fields + send
 * @route   POST /api/v1/envelopes/wizard
 * @access  Private
 */
const submitWizard = (req, res, next) => {
  // ── Multer setup (inline, same pattern as documentController) ───────────────
  const ACCEPTED = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
  ];

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '../../uploads/documents');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `wizard-${suffix}${path.extname(file.originalname)}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (ACCEPTED.includes(file.mimetype)) cb(null, true);
      else cb(new Error('Unsupported file type. Please upload a PDF, Word document, or image.'));
    },
  }).single('file');

  upload(req, res, async (uploadErr) => {
    if (uploadErr) return next(new ApiError(400, uploadErr.message));
    if (!req.file) return next(new ApiError(400, 'No file uploaded'));

    try {
      const userId = req.user.id;
      const orgId  = req.user.orgId ?? req.user.org_id;

      // ── Parse signers / fields from FormData JSON strings ─────────────────
      let signers = [], fields = [];
      try {
        signers = JSON.parse(req.body.signers || '[]');
        fields  = JSON.parse(req.body.fields  || '[]');
      } catch {
        return next(new ApiError(400, 'Invalid signers or fields JSON'));
      }

      // ── Subscription limit check ───────────────────────────────────────────
      const orgData = await db('organizations')
        .join('subscriptions', 'organizations.id', 'subscriptions.org_id')
        .join('plans', 'subscriptions.plan_id', 'plans.id')
        .where('organizations.id', orgId)
        .select('plans.envelope_limit')
        .first();

      if (!orgData) throw new ApiError(404, 'Organization or subscription not found');

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { count: envCount } = await db('envelopes')
        .where('org_id', orgId)
        .where('created_at', '>=', startOfMonth)
        .count('id as count')
        .first();
      const envelopeLimit = orgData.envelopeLimit ?? orgData.envelope_limit;
      if (parseInt(envCount) >= envelopeLimit) {
        throw new ApiError(403, 'Monthly envelope limit reached for your subscription tier');
      }

      // ── Process uploaded file (convert images / Word to PDF) ──────────────
      let filePath = req.file.path;
      const origMime = req.file.mimetype;
      const origName = req.file.originalname;
      let fileType = 'application/pdf';
      let fileName = origName.replace(/\.(docx?|jpe?g|png)$/i, '.pdf');

      if (origMime === 'image/jpeg' || origMime === 'image/png') {
        const imgBuf = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.create();
        const img = origMime === 'image/jpeg'
          ? await pdfDoc.embedJpg(imgBuf)
          : await pdfDoc.embedPng(imgBuf);
        const pg = pdfDoc.addPage([img.width, img.height]);
        pg.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        const pdfBytes = await pdfDoc.save();
        const pdfPath = filePath.replace(/\.(jpe?g|png)$/i, '.pdf');
        fs.writeFileSync(pdfPath, pdfBytes);
        fs.unlinkSync(filePath);
        filePath = pdfPath;
      } else if (
        origMime === 'application/msword' ||
        origMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        try {
          const { execSync } = require('child_process');
          execSync(`libreoffice --headless --convert-to pdf --outdir "${path.dirname(filePath)}" "${filePath}"`, { timeout: 30000 });
          const pdfPath = filePath.replace(/\.docx?$/i, '.pdf');
          if (fs.existsSync(pdfPath)) {
            fs.unlinkSync(filePath);
            filePath = pdfPath;
          } else {
            fileType = origMime;
            fileName = origName;
          }
        } catch {
          fileType = origMime;
          fileName = origName;
        }
      } else {
        fileName = origName;
      }

      const fileBuf  = fs.readFileSync(filePath);
      const fileSize = fileBuf.length;
      const hash     = crypto.createHash('sha256').update(fileBuf).digest('hex');
      let pageCount  = 1;
      if (fileType === 'application/pdf') {
        try { const pd = await PDFDocument.load(fileBuf); pageCount = pd.getPageCount(); } catch {}
      }

      // ── Create envelope ────────────────────────────────────────────────────
      const envelopeId = uuidv4();
      await db('envelopes').insert({
        id:          envelopeId,
        name:        origName,
        status:      'draft',
        org_id:      orgId,
        created_by:  userId,
        expiry_days: 30,
      });

      // ── Save document ──────────────────────────────────────────────────────
      const documentId = uuidv4();
      await db('documents').insert({
        id:          documentId,
        envelope_id: envelopeId,
        name:        fileName,
        file_path:   filePath,
        file_type:   fileType,
        file_size:   fileSize,
        sha256_hash: hash,
        page_count:  pageCount,
      });

      // ── Insert signers, build wizard-index → DB-UUID map ──────────────────
      // Map wizard field types to DB accepted values
      const FIELD_TYPE_MAP = {
        initials: 'initial',
        stamp:    'text',   // no stamp type in DB — store as text
      };

      const signerMap = {}; // numeric wizard index → { id, email, name, phone, role }
      for (let i = 0; i < signers.length; i++) {
        const s = signers[i];
        if (!s.email || !/\S+@\S+\.\S+/.test(s.email)) continue;
        const parts      = (s.name || '').trim().split(/\s+/);
        const first_name = parts[0] || 'Unknown';
        const last_name  = parts.slice(1).join(' ') || '';
        const dbId       = uuidv4();
        const role       = ['signer', 'approver', 'cc', 'viewer'].includes(s.role) ? s.role : 'signer';
        await db('signers').insert({
          id:          dbId,
          envelope_id: envelopeId,
          email:       s.email.trim().toLowerCase(),
          first_name,
          last_name,
          phone:  s.phone || null,
          role,
          order:  i + 1,
          status: 'pending',
        });
        signerMap[i] = {
          id:    dbId,
          email: s.email,
          name:  `${first_name} ${last_name}`.trim(),
          phone: s.phone,
          role,
        };
      }

      // ── Insert fields ──────────────────────────────────────────────────────
      for (const field of fields) {
        const signer = signerMap[field.signerId];
        if (!signer) continue;
        const dbType = FIELD_TYPE_MAP[field.type] || field.type;
        try {
          await db('fields').insert({
            id:           uuidv4(),
            document_id:  documentId,
            envelope_id:  envelopeId,
            signer_id:    signer.id,
            type:         dbType,
            page:         field.page || 1,
            x_position:   field.x,
            y_position:   field.y,
            width:        field.width,
            height:       field.height,
            label:        field.label || null,
            required:     field.required !== false,
            created_by:   userId,
          });
        } catch (fieldErr) {
          console.error('Error inserting field:', fieldErr.message);
          // Non-fatal — continue with other fields
        }
      }

      // ── Notify CC / viewer recipients (no signing link) ───────────────────
      for (const signer of Object.values(signerMap)) {
        if (signer.role !== 'cc' && signer.role !== 'viewer') continue;
        try {
          if (process.env.RESEND_API_KEY) {
            await axios.post(
              'https://api.resend.com/emails',
              {
                from:    process.env.EMAIL_FROM || 'Sayina <onboarding@resend.dev>',
                to:      signer.email,
                subject: `You have been CC'd on: "${origName}"`,
                html: `
                  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                    <h2 style="color:#1e3a5f;">Document Notification</h2>
                    <p>Hi ${signer.name},</p>
                    <p>You have been copied on a document that has been sent for signing: <strong>${origName}</strong></p>
                    <p style="color:#666;font-size:13px;">You will receive a copy once all parties have signed.</p>
                    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
                    <p style="color:#999;font-size:12px;">Sayina E-Signature Platform</p>
                  </div>`,
              },
              { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' } }
            );
          }
        } catch (ccEmailErr) {
          console.error(`CC email failed for ${signer.email}:`, ccEmailErr.message);
        }
      }

      // ── Generate signing tokens + send emails ──────────────────────────────
      const signingUrls = [];
      for (const signer of Object.values(signerMap)) {
        if (signer.role === 'cc' || signer.role === 'viewer') continue;

        const accessToken = uuidv4();

        // Store token in Redis (best-effort)
        try {
          await redisClient.set(
            `signing_token:${accessToken}`,
            JSON.stringify({ envelope_id: envelopeId, signer_id: signer.id }),
            'EX',
            30 * 24 * 60 * 60
          );
        } catch (redisErr) {
          console.error('Redis signing token error:', redisErr.message);
        }

        const signingUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/sign/${accessToken}`;
        signingUrls.push({
          signer_id:    signer.id,
          signer_email: signer.email,
          signer_name:  signer.name,
          signing_url:  signingUrl,
        });

        // Send invitation email (best-effort — never fails the whole request)
        try {
          if (process.env.RESEND_API_KEY) {
            await axios.post(
              'https://api.resend.com/emails',
              {
                from:    process.env.EMAIL_FROM || 'Sayina <onboarding@resend.dev>',
                to:      signer.email,
                subject: `Please sign: "${origName}"`,
                html: `
                  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                    <h2 style="color:#1e3a5f;">Document Signature Request</h2>
                    <p>Hi ${signer.name},</p>
                    <p>You have been invited to review and sign the document: <strong>${origName}</strong></p>
                    <p style="margin:24px 0;">
                      <a href="${signingUrl}"
                         style="background:#3b82f6;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
                        Sign Document
                      </a>
                    </p>
                    <p style="color:#666;font-size:13px;">Or copy this link into your browser:<br>${signingUrl}</p>
                    <p style="color:#666;font-size:13px;">This link expires in 30 days.</p>
                    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
                    <p style="color:#999;font-size:12px;">Sayina E-Signature Platform</p>
                  </div>`,
              },
              { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' } }
            );
          } else {
            // Fall back to existing SMTP email service
            const { sendSigningInvitation } = require('../services/emailService');
            await sendSigningInvitation(signer.email, signer.name, {
              envelope_name: origName,
              signing_url:   signingUrl,
              organization_name: 'Sayina',
            });
          }
        } catch (emailErr) {
          console.error(`Email failed for ${signer.email}:`, emailErr.message);
        }
      }

      // ── Update envelope status to 'sent' ────────────────────────────────────
      await db('envelopes').where({ id: envelopeId }).update({
        status:     'sent',
        sent_at:    db.fn.now(),
        updated_at: db.fn.now(),
      });

      // Mark first active signer as 'current'
      const firstActive = Object.values(signerMap).find(s => s.role !== 'cc' && s.role !== 'viewer');
      if (firstActive) {
        await db('signers').where({ id: firstActive.id }).update({ status: 'current', updated_at: db.fn.now() });
      }

      // Log event
      await db('events').insert({
        envelope_id: envelopeId,
        user_id:     userId,
        action:      'envelope_sent',
        metadata:    JSON.stringify({ signer_count: signers.length, source: 'wizard' }),
        ip_address:  req.ip,
        user_agent:  req.headers['user-agent'],
      });

      res.status(200).json({
        success: true,
        message: 'Envelope created and sent successfully',
        data: { envelopeId, signingUrls },
      });
    } catch (error) {
      // Clean up uploaded file on any error
      try {
        if (req.file && req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      } catch {}
      next(error);
    }
  });
};

/**
 * @desc    Get envelope data for external signer (public, token-based)
 * @route   GET /api/v1/signing/:token
 * @access  Public (validated via Redis signing token)
 */
const getEnvelopeForSigning = async (req, res, next) => {
  try {
    const { token } = req.params;

    // Look up signing token in Redis
    const tokenData = await redisClient.get(`signing_token:${token}`);
    if (!tokenData) {
      return next(new ApiError(401, 'Not authorized, invalid token'));
    }

    const { envelope_id, signer_id, expiry } = JSON.parse(tokenData);

    // Check expiry if stored in payload
    if (expiry && new Date(expiry) < new Date()) {
      return next(new ApiError(401, 'Signing link has expired'));
    }

    // Get envelope
    const envelope = await db('envelopes')
      .where({ id: envelope_id })
      .select('id', 'name', 'status', 'org_id', 'expiry_days')
      .first();

    if (!envelope) {
      return next(new ApiError(404, 'Envelope not found'));
    }

    if (['cancelled', 'expired'].includes(envelope.status)) {
      return next(new ApiError(410, `This envelope has been ${envelope.status}`));
    }

    // Get signer
    const signer = await db('signers')
      .where({ id: signer_id, envelope_id: envelope_id })
      .first();

    if (!signer) {
      return next(new ApiError(404, 'Signer not found'));
    }

    if (['signed', 'completed', 'declined', 'cancelled'].includes(signer.status)) {
      return next(new ApiError(403, 'Signer access is no longer valid'));
    }

    // Get document
    const document = await db('documents')
      .where({ envelope_id: envelope_id })
      .select('id', 'name', 'file_path')
      .first();

    // Get fields for this signer
    const fields = document
      ? await db('fields')
          .where({ document_id: document.id, signer_id: signer_id })
          .select('*')
      : [];

    // Check if org requires OTP
    const org = await db('organizations')
      .where({ id: envelope.org_id })
      .select('require_otp')
      .first();

    const fileUrl = document ? `/uploads/${path.basename(document.file_path)}` : null;

    res.status(200).json({
      envelope: {
        id: envelope.id,
        name: envelope.name,
        fileUrl,
        orgId: envelope.org_id,
      },
      signer: {
        id: signer.id,
        name: signer.first_name
          ? `${signer.first_name} ${signer.last_name}`
          : signer.name || signer.email,
        email: signer.email,
        status: signer.status,
      },
      fields,
      requiresOTP: !!(org && org.require_otp),
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
  getEnvelopeStatus,
  submitWizard,
  getEnvelopeForSigning,
};
