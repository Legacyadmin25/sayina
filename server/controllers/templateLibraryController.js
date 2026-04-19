/**
 * Template Library Controller
 * 
 * This controller handles document template management for the Sayina E-Signature platform,
 * allowing users to create, share, and use reusable document templates.
 */

const { ApiError } = require('../middleware/errorMiddleware');
const { 
  createDocumentTemplate,
  updateDocumentTemplate,
  updateTemplateFile,
  deleteDocumentTemplate,
  getDocumentTemplate,
  getOrganizationTemplates,
  getTemplateCategories,
  getTemplateTags,
  createEnvelopeFromTemplate,
  getTemplateUsageHistory,
  shareTemplateWithOrganization,
  makeTemplatePrivate
} = require('../services/templateLibraryService');
const { logSystemEvent } = require('../services/loggerService');
const multer = require('multer');
const { db } = require('../config/db');

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
}).single('file');

/**
 * @desc    Create a document template
 * @route   POST /api/v1/templates/library
 * @access  Private
 */
const createTemplate = async (req, res, next) => {
  // Use multer to handle file upload
  upload(req, res, async (err) => {
    try {
      if (err) {
        return next(new ApiError(400, `File upload error: ${err.message}`));
      }
      
      const { 
        name, 
        description, 
        category,
        fields,
        is_public,
        tags
      } = req.body;
      
      const userId = req.user.id;
      const orgId = req.user.org_id;
      
      // Check if file was uploaded
      if (!req.file) {
        return next(new ApiError(400, 'No file uploaded'));
      }
      
      // Validate required fields
      if (!name) {
        return next(new ApiError(400, 'Template name is required'));
      }
      
      // Parse fields and tags if provided as strings
      let parsedFields = [];
      if (fields) {
        try {
          parsedFields = typeof fields === 'string' ? JSON.parse(fields) : fields;
        } catch (error) {
          return next(new ApiError(400, 'Invalid fields format'));
        }
      }
      
      let parsedTags = [];
      if (tags) {
        try {
          parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
        } catch (error) {
          return next(new ApiError(400, 'Invalid tags format'));
        }
      }
      
      // Create template
      const templateId = await createDocumentTemplate(orgId, userId, {
        name,
        description,
        category,
        fields: parsedFields,
        is_public: is_public === 'true',
        tags: parsedTags
      }, req.file);
      
      // Log event
      await logSystemEvent({
        user_id: userId,
        action: 'document_template_created',
        metadata: {
          template_id: templateId,
          template_name: name
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
      
      res.status(201).json({
        success: true,
        message: 'Document template created successfully',
        data: {
          template_id: templateId
        }
      });
    } catch (error) {
      next(error);
    }
  });
};

/**
 * @desc    Update document template
 * @route   PUT /api/v1/templates/library/:id
 * @access  Private
 */
const updateTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      category,
      fields,
      is_public,
      tags
    } = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Check if template exists and belongs to organization
    const template = await getDocumentTemplate(id);
    
    if (template.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to update this template'));
    }
    
    // Parse fields and tags if provided as strings
    let parsedFields = undefined;
    if (fields) {
      try {
        parsedFields = typeof fields === 'string' ? JSON.parse(fields) : fields;
      } catch (error) {
        return next(new ApiError(400, 'Invalid fields format'));
      }
    }
    
    let parsedTags = undefined;
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (error) {
        return next(new ApiError(400, 'Invalid tags format'));
      }
    }
    
    // Update template
    await updateDocumentTemplate(id, {
      name,
      description,
      category,
      fields: parsedFields,
      is_public: is_public !== undefined ? is_public === 'true' : undefined,
      tags: parsedTags
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'document_template_updated',
      metadata: {
        template_id: id,
        template_name: name || template.name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Document template updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update template file
 * @route   PUT /api/v1/templates/library/:id/file
 * @access  Private
 */
const updateTemplateFileHandler = async (req, res, next) => {
  // Use multer to handle file upload
  upload(req, res, async (err) => {
    try {
      if (err) {
        return next(new ApiError(400, `File upload error: ${err.message}`));
      }
      
      const { id } = req.params;
      const userId = req.user.id;
      const orgId = req.user.org_id;
      
      // Check if file was uploaded
      if (!req.file) {
        return next(new ApiError(400, 'No file uploaded'));
      }
      
      // Check if template exists and belongs to organization
      const template = await getDocumentTemplate(id);
      
      if (template.org_id !== orgId) {
        return next(new ApiError(403, 'You do not have permission to update this template'));
      }
      
      // Update template file
      await updateTemplateFile(id, req.file);
      
      // Log event
      await logSystemEvent({
        user_id: userId,
        action: 'document_template_file_updated',
        metadata: {
          template_id: id,
          template_name: template.name,
          file_name: req.file.originalname
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
      
      res.status(200).json({
        success: true,
        message: 'Template file updated successfully'
      });
    } catch (error) {
      next(error);
    }
  });
};

/**
 * @desc    Delete document template
 * @route   DELETE /api/v1/templates/library/:id
 * @access  Private
 */
const deleteTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Check if template exists and belongs to organization
    const template = await getDocumentTemplate(id);
    
    if (template.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to delete this template'));
    }
    
    // Delete template
    await deleteDocumentTemplate(id);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'document_template_deleted',
      metadata: {
        template_id: id,
        template_name: template.name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Document template deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get document template
 * @route   GET /api/v1/templates/library/:id
 * @access  Private
 */
const getTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;
    
    // Get template
    const template = await getDocumentTemplate(id);
    
    // Check if template belongs to organization or is public
    if (template.org_id !== orgId && !template.is_public) {
      return next(new ApiError(403, 'You do not have permission to view this template'));
    }
    
    res.status(200).json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get organization templates
 * @route   GET /api/v1/templates/library
 * @access  Private
 */
const getTemplates = async (req, res, next) => {
  try {
    const { 
      category, 
      search, 
      tags, 
      is_public, 
      limit = 20, 
      offset = 0 
    } = req.query;
    
    const orgId = req.user.org_id;
    
    // Parse tags if provided
    let parsedTags = undefined;
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (error) {
        return next(new ApiError(400, 'Invalid tags format'));
      }
    }
    
    // Get templates
    const templates = await getOrganizationTemplates(orgId, {
      category,
      search,
      tags: parsedTags,
      is_public: is_public !== undefined ? is_public === 'true' : undefined,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.status(200).json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get template categories
 * @route   GET /api/v1/templates/library/categories
 * @access  Private
 */
const getCategories = async (req, res, next) => {
  try {
    const orgId = req.user.org_id;
    
    // Get categories
    const categories = await getTemplateCategories(orgId);
    
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get template tags
 * @route   GET /api/v1/templates/library/tags
 * @access  Private
 */
const getTags = async (req, res, next) => {
  try {
    const orgId = req.user.org_id;
    
    // Get tags
    const tags = await getTemplateTags(orgId);
    
    res.status(200).json({
      success: true,
      count: tags.length,
      data: tags
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create envelope from template
 * @route   POST /api/v1/templates/library/:id/create-envelope
 * @access  Private
 */
const createEnvelopeFromTemplateHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Check if template exists and belongs to organization or is public
    const template = await getDocumentTemplate(id);
    
    if (template.org_id !== orgId && !template.is_public) {
      return next(new ApiError(403, 'You do not have permission to use this template'));
    }
    
    // Create envelope
    const envelopeId = await createEnvelopeFromTemplate(id, userId, {
      name,
      description
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'envelope_created_from_template',
      metadata: {
        template_id: id,
        template_name: template.name,
        envelope_id: envelopeId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'Envelope created successfully from template',
      data: {
        envelope_id: envelopeId
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get template usage history
 * @route   GET /api/v1/templates/library/:id/usage
 * @access  Private
 */
const getUsageHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    const orgId = req.user.org_id;
    
    // Check if template exists and belongs to organization
    const template = await getDocumentTemplate(id);
    
    if (template.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to view this template'));
    }
    
    // Get usage history
    const usage = await getTemplateUsageHistory(id, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.status(200).json({
      success: true,
      count: usage.length,
      data: usage
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Share template with organization
 * @route   POST /api/v1/templates/library/:id/share
 * @access  Private
 */
const shareTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Check if template exists and belongs to organization
    const template = await getDocumentTemplate(id);
    
    if (template.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to share this template'));
    }
    
    // Share template
    await shareTemplateWithOrganization(id);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'document_template_shared',
      metadata: {
        template_id: id,
        template_name: template.name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Template shared with organization successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Make template private
 * @route   POST /api/v1/templates/library/:id/make-private
 * @access  Private
 */
const makePrivate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Check if template exists and belongs to organization
    const template = await getDocumentTemplate(id);
    
    if (template.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to modify this template'));
    }
    
    // Make template private
    await makeTemplatePrivate(id);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'document_template_made_private',
      metadata: {
        template_id: id,
        template_name: template.name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Template made private successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download template file
 * @route   GET /api/v1/templates/library/:id/download
 * @access  Private
 */
const downloadTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;
    
    // Get template
    const template = await getDocumentTemplate(id);
    
    // Check if template belongs to organization or is public
    if (template.org_id !== orgId && !template.is_public) {
      return next(new ApiError(403, 'You do not have permission to download this template'));
    }
    
    // Log event
    await logSystemEvent({
      user_id: req.user.id,
      action: 'document_template_downloaded',
      metadata: {
        template_id: id,
        template_name: template.name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    // Send file
    res.download(template.file_path, template.file_name);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTemplate,
  updateTemplate,
  updateTemplateFileHandler,
  deleteTemplate,
  getTemplate,
  getTemplates,
  getCategories,
  getTags,
  createEnvelopeFromTemplateHandler,
  getUsageHistory,
  shareTemplate,
  makePrivate,
  downloadTemplate
};
