const { v4: uuidv4 } = require('uuid');
const { ApiError } = require('../middleware/errorMiddleware');
const { db } = require('../config/db');
const { checkDocumentQuota } = require('../utils/subscriptionHelper');
const { logSystemEvent } = require('../services/loggerService');
const fs = require('fs');
const path = require('path');

/**
 * @desc    Create document template
 * @route   POST /api/v1/templates
 * @access  Private
 */
const createTemplate = async (req, res, next) => {
  try {
    const { name, description, category, is_public } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check document quota
    const quotaCheck = await checkDocumentQuota(orgId);
    if (!quotaCheck.sufficient) {
      return next(new ApiError(403, `Document quota exceeded. Your plan allows ${quotaCheck.limit} documents.`));
    }

    // Validate document file
    if (!req.file) {
      return next(new ApiError(400, 'Template document file is required'));
    }

    // Create template
    const _templateIdResult = await db('templates').insert({
      id: uuidv4(),
      org_id: orgId,
      name,
      description: description || null,
      category: category || 'general',
      file_path: req.file.path,
      file_name: req.file.originalname,
      file_size: req.file.size,
      file_type: req.file.mimetype,
      is_public: is_public === true,
      created_by: userId
    }).returning('id');
    const templateId = _templateIdResult[0]?.id ?? _templateIdResult[0];

    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'template_created',
      metadata: {
        template_id: templateId,
        template_name: name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Get created template
    const template = await db('templates')
      .where('id', templateId)
      .first();

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: {
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        file_name: template.file_name,
        file_size: template.file_size,
        file_type: template.file_type,
        is_public: template.is_public,
        created_at: template.created_at
      }
    });
  } catch (error) {
    // Clean up file if error occurs
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    next(error);
  }
};

/**
 * @desc    Get all templates for organization
 * @route   GET /api/v1/templates
 * @access  Private
 */
const getTemplates = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const orgId = req.user.org_id;

    // Build query
    let query = db('templates')
      .where(function() {
        this.where('org_id', orgId)
          .orWhere('is_public', true);
      });

    // Filter by category
    if (category) {
      query = query.where('category', category);
    }

    // Search by name or description
    if (search) {
      query = query.where(function() {
        this.where('name', 'like', `%${search}%`)
          .orWhere('description', 'like', `%${search}%`);
      });
    }

    // Get templates
    const templates = await query
      .select('id', 'name', 'description', 'category', 'file_name', 'file_size', 'file_type', 'is_public', 'created_at', 'created_by', 'org_id')
      .orderBy('created_at', 'desc');

    // Get user details for templates
    const userIds = [...new Set(templates.map(template => template.created_by))];
    const users = await db('users')
      .whereIn('id', userIds)
      .select('id', 'first_name', 'last_name', 'email');

    // Map users to templates
    const templatesWithUsers = templates.map(template => {
      const user = users.find(user => user.id === template.created_by);
      return {
        ...template,
        created_by: user ? {
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email
        } : null,
        is_owner: template.org_id === orgId
      };
    });

    res.status(200).json({
      success: true,
      count: templatesWithUsers.length,
      data: templatesWithUsers
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get template by ID
 * @route   GET /api/v1/templates/:id
 * @access  Private
 */
const getTemplateById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;

    // Get template
    const template = await db('templates')
      .where('id', id)
      .first();

    if (!template) {
      return next(new ApiError(404, 'Template not found'));
    }

    // Check if user has access to template
    if (template.org_id !== orgId && !template.is_public) {
      return next(new ApiError(403, 'You do not have access to this template'));
    }

    // Get creator details
    const creator = await db('users')
      .where('id', template.created_by)
      .select('id', 'first_name', 'last_name', 'email')
      .first();

    // Get fields if any
    const fields = await db('template_fields')
      .where('template_id', id)
      .orderBy('page', 'asc')
      .orderBy('y_position', 'asc');

    res.status(200).json({
      success: true,
      data: {
        ...template,
        created_by: creator ? {
          id: creator.id,
          name: `${creator.first_name} ${creator.last_name}`,
          email: creator.email
        } : null,
        is_owner: template.org_id === orgId,
        fields: fields || []
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update template
 * @route   PUT /api/v1/templates/:id
 * @access  Private
 */
const updateTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, category, is_public } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if template exists and belongs to organization
    const template = await db('templates')
      .where('id', id)
      .where('org_id', orgId)
      .first();

    if (!template) {
      return next(new ApiError(404, 'Template not found or does not belong to your organization'));
    }

    // Update template
    await db('templates')
      .where('id', id)
      .update({
        name: name || template.name,
        description: description !== undefined ? description : template.description,
        category: category || template.category,
        is_public: is_public !== undefined ? is_public : template.is_public,
        updated_at: db.fn.now(),
        updated_by: userId
      });

    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'template_updated',
      metadata: {
        template_id: id,
        template_name: name || template.name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Get updated template
    const updatedTemplate = await db('templates')
      .where('id', id)
      .first();

    res.status(200).json({
      success: true,
      message: 'Template updated successfully',
      data: {
        id: updatedTemplate.id,
        name: updatedTemplate.name,
        description: updatedTemplate.description,
        category: updatedTemplate.category,
        file_name: updatedTemplate.file_name,
        file_size: updatedTemplate.file_size,
        file_type: updatedTemplate.file_type,
        is_public: updatedTemplate.is_public,
        created_at: updatedTemplate.created_at,
        updated_at: updatedTemplate.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete template
 * @route   DELETE /api/v1/templates/:id
 * @access  Private
 */
const deleteTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if template exists and belongs to organization
    const template = await db('templates')
      .where('id', id)
      .where('org_id', orgId)
      .first();

    if (!template) {
      return next(new ApiError(404, 'Template not found or does not belong to your organization'));
    }

    // Delete template fields
    await db('template_fields')
      .where('template_id', id)
      .delete();

    // Delete template
    await db('templates')
      .where('id', id)
      .delete();

    // Delete template file
    if (template.file_path) {
      fs.unlink(template.file_path, (err) => {
        if (err) console.error('Error deleting template file:', err);
      });
    }

    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'template_deleted',
      metadata: {
        template_id: id,
        template_name: template.name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add field to template
 * @route   POST /api/v1/templates/:id/fields
 * @access  Private
 */
const addTemplateField = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      type, page, x_position, y_position, width, height, 
      required, label, default_value, placeholder, options 
    } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if template exists and belongs to organization
    const template = await db('templates')
      .where('id', id)
      .where('org_id', orgId)
      .first();

    if (!template) {
      return next(new ApiError(404, 'Template not found or does not belong to your organization'));
    }

    // Validate field type
    const validTypes = ['signature', 'initial', 'date', 'text', 'checkbox', 'name', 'email', 'company', 'title', 'dropdown', 'radio', 'attachment'];
    if (!validTypes.includes(type)) {
      return next(new ApiError(400, `Invalid field type. Must be one of: ${validTypes.join(', ')}`));
    }

    // Create field
    const _fieldIdResult = await db('template_fields').insert({
      id: uuidv4(),
      template_id: id,
      type,
      page,
      x_position,
      y_position,
      width,
      height,
      required: required === true,
      label: label || null,
      default_value: default_value || null,
      placeholder: placeholder || null,
      options: options ? JSON.stringify(options) : null,
      created_by: userId
    }).returning('id');
    const fieldId = _fieldIdResult[0]?.id ?? _fieldIdResult[0];

    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'template_field_added',
      metadata: {
        template_id: id,
        field_id: fieldId,
        field_type: type
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Get created field
    const field = await db('template_fields')
      .where('id', fieldId)
      .first();

    // Format options
    if (field.options) {
      field.options = JSON.parse(field.options);
    }

    res.status(201).json({
      success: true,
      message: 'Field added to template successfully',
      data: field
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update template field
 * @route   PUT /api/v1/templates/fields/:fieldId
 * @access  Private
 */
const updateTemplateField = async (req, res, next) => {
  try {
    const { fieldId } = req.params;
    const { 
      type, page, x_position, y_position, width, height, 
      required, label, default_value, placeholder, options 
    } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if field exists and belongs to organization's template
    const field = await db('template_fields')
      .join('templates', 'template_fields.template_id', 'templates.id')
      .where('template_fields.id', fieldId)
      .where('templates.org_id', orgId)
      .select('template_fields.*', 'templates.id as template_id', 'templates.name as template_name')
      .first();

    if (!field) {
      return next(new ApiError(404, 'Field not found or does not belong to your organization'));
    }

    // Validate field type if provided
    if (type) {
      const validTypes = ['signature', 'initial', 'date', 'text', 'checkbox', 'name', 'email', 'company', 'title', 'dropdown', 'radio', 'attachment'];
      if (!validTypes.includes(type)) {
        return next(new ApiError(400, `Invalid field type. Must be one of: ${validTypes.join(', ')}`));
      }
    }

    // Prepare update data
    const updateData = {};
    if (type) updateData.type = type;
    if (page !== undefined) updateData.page = page;
    if (x_position !== undefined) updateData.x_position = x_position;
    if (y_position !== undefined) updateData.y_position = y_position;
    if (width !== undefined) updateData.width = width;
    if (height !== undefined) updateData.height = height;
    if (required !== undefined) updateData.required = required;
    if (label !== undefined) updateData.label = label;
    if (default_value !== undefined) updateData.default_value = default_value;
    if (placeholder !== undefined) updateData.placeholder = placeholder;
    if (options !== undefined) updateData.options = JSON.stringify(options);
    updateData.updated_at = db.fn.now();
    updateData.updated_by = userId;

    // Update field
    await db('template_fields')
      .where('id', fieldId)
      .update(updateData);

    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'template_field_updated',
      metadata: {
        template_id: field.template_id,
        field_id: fieldId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Get updated field
    const updatedField = await db('template_fields')
      .where('id', fieldId)
      .first();

    // Format options
    if (updatedField.options) {
      updatedField.options = JSON.parse(updatedField.options);
    }

    res.status(200).json({
      success: true,
      message: 'Template field updated successfully',
      data: updatedField
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete template field
 * @route   DELETE /api/v1/templates/fields/:fieldId
 * @access  Private
 */
const deleteTemplateField = async (req, res, next) => {
  try {
    const { fieldId } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if field exists and belongs to organization's template
    const field = await db('template_fields')
      .join('templates', 'template_fields.template_id', 'templates.id')
      .where('template_fields.id', fieldId)
      .where('templates.org_id', orgId)
      .select('template_fields.*', 'templates.id as template_id', 'templates.name as template_name')
      .first();

    if (!field) {
      return next(new ApiError(404, 'Field not found or does not belong to your organization'));
    }

    // Delete field
    await db('template_fields')
      .where('id', fieldId)
      .delete();

    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'template_field_deleted',
      metadata: {
        template_id: field.template_id,
        field_id: fieldId,
        field_type: field.type
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'Template field deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create envelope from template
 * @route   POST /api/v1/templates/:id/create-envelope
 * @access  Private
 */
const createEnvelopeFromTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, message, expiry_days } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if template exists
    const template = await db('templates')
      .where(function() {
        this.where('id', id)
          .andWhere(function() {
            this.where('org_id', orgId)
              .orWhere('is_public', true);
          });
      })
      .first();

    if (!template) {
      return next(new ApiError(404, 'Template not found or you do not have access to it'));
    }

    // Check envelope quota
    const quotaCheck = await checkEnvelopeQuota(orgId);
    if (!quotaCheck.sufficient) {
      return next(new ApiError(403, `Envelope quota exceeded. Your plan allows ${quotaCheck.limit} envelopes per month.`));
    }

    // Create envelope
    const _envelopeIdResult = await db('envelopes').insert({
      id: uuidv4(),
      org_id: orgId,
      name: name || template.name,
      message: message || null,
      expiry_days: expiry_days || 30,
      status: 'draft',
      created_by: userId
    }).returning('id');
    const envelopeId = _envelopeIdResult[0]?.id ?? _envelopeIdResult[0];

    // Copy template file to document
    const templateFilePath = template.file_path;
    const documentFileName = `${path.basename(templateFilePath, path.extname(templateFilePath))}_${Date.now()}${path.extname(templateFilePath)}`;
    const documentFilePath = path.join(path.dirname(templateFilePath), '..', 'documents', documentFileName);

    // Ensure directory exists
    const documentsDir = path.join(path.dirname(templateFilePath), '..', 'documents');
    if (!fs.existsSync(documentsDir)) {
      fs.mkdirSync(documentsDir, { recursive: true });
    }

    // Copy file
    fs.copyFileSync(templateFilePath, documentFilePath);

    // Create document
    const _documentIdResult = await db('documents').insert({
      id: uuidv4(),
      envelope_id: envelopeId,
      org_id: orgId,
      name: template.name,
      file_path: documentFilePath,
      file_name: template.file_name,
      file_size: template.file_size,
      file_type: template.file_type,
      created_by: userId
    }).returning('id');
    const documentId = _documentIdResult[0]?.id ?? _documentIdResult[0];

    // Get template fields
    const templateFields = await db('template_fields')
      .where('template_id', id)
      .orderBy('page', 'asc')
      .orderBy('y_position', 'asc');

    // Log events
    await logSystemEvent({
      user_id: userId,
      action: 'envelope_created_from_template',
      metadata: {
        envelope_id: envelopeId,
        template_id: id,
        template_name: template.name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(201).json({
      success: true,
      message: 'Envelope created from template successfully',
      data: {
        envelope_id: envelopeId,
        document_id: documentId,
        template_id: id,
        template_fields: templateFields
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  addTemplateField,
  updateTemplateField,
  deleteTemplateField,
  createEnvelopeFromTemplate
};
