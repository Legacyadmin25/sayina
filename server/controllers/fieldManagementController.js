/**
 * Field Management Controller
 * 
 * This controller handles field management features for the Sayina E-Signature platform,
 * including field templates, validation rules, and conditional logic.
 */

const { ApiError } = require('../middleware/errorMiddleware');
const {
  createFieldTemplate,
  updateFieldTemplate,
  deleteFieldTemplate,
  getFieldTemplate,
  getOrganizationFieldTemplates,
  addFieldToDocument,
  updateDocumentField,
  deleteDocumentField,
  getDocumentFields,
  validateFieldValue,
  evaluateConditionalLogic,
  extractFieldsFromDocument
} = require('../services/fieldManagementService');
const { logSystemEvent } = require('../services/loggerService');

/**
 * @desc    Create field template
 * @route   POST /api/v1/fields/templates
 * @access  Private
 */
const createFieldTemplateHandler = async (req, res, next) => {
  try {
    const {
      name,
      description,
      field_type,
      default_properties,
      validation_rules,
      category
    } = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Validate required fields
    if (!name || !field_type) {
      return next(new ApiError(400, 'Name and field type are required'));
    }
    
    // Create field template
    const templateId = await createFieldTemplate(orgId, userId, {
      name,
      description,
      field_type,
      default_properties,
      validation_rules,
      category
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'field_template_created',
      metadata: {
        template_id: templateId,
        template_name: name,
        field_type
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'Field template created successfully',
      data: {
        template_id: templateId
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update field template
 * @route   PUT /api/v1/fields/templates/:id
 * @access  Private
 */
const updateFieldTemplateHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      field_type,
      default_properties,
      validation_rules,
      category,
      is_active
    } = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Check if template exists and belongs to organization
    const template = await getFieldTemplate(id);
    
    if (template.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to update this template'));
    }
    
    // Update field template
    await updateFieldTemplate(id, {
      name,
      description,
      field_type,
      default_properties,
      validation_rules,
      category,
      is_active
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'field_template_updated',
      metadata: {
        template_id: id,
        template_name: name || template.name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Field template updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete field template
 * @route   DELETE /api/v1/fields/templates/:id
 * @access  Private
 */
const deleteFieldTemplateHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Check if template exists and belongs to organization
    const template = await getFieldTemplate(id);
    
    if (template.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to delete this template'));
    }
    
    // Delete field template
    await deleteFieldTemplate(id);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'field_template_deleted',
      metadata: {
        template_id: id,
        template_name: template.name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Field template deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get field template
 * @route   GET /api/v1/fields/templates/:id
 * @access  Private
 */
const getFieldTemplateHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;
    
    // Get field template
    const template = await getFieldTemplate(id);
    
    // Check if template belongs to organization
    if (template.org_id !== orgId) {
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
 * @desc    Get organization field templates
 * @route   GET /api/v1/fields/templates
 * @access  Private
 */
const getFieldTemplatesHandler = async (req, res, next) => {
  try {
    const {
      field_type,
      category,
      is_active,
      search,
      limit = 20,
      offset = 0
    } = req.query;
    
    const orgId = req.user.org_id;
    
    // Get field templates
    const templates = await getOrganizationFieldTemplates(orgId, {
      field_type,
      category,
      is_active: is_active === 'true',
      search,
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
 * @desc    Add field to document
 * @route   POST /api/v1/documents/:documentId/fields
 * @access  Private
 */
const addFieldToDocumentHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const {
      name,
      field_type,
      template_id,
      properties,
      validation_rules,
      conditional_logic,
      page_number,
      position_x,
      position_y,
      width,
      height
    } = req.body;
    
    const userId = req.user.id;
    
    // Validate required fields
    if (!name || !field_type) {
      return next(new ApiError(400, 'Name and field type are required'));
    }
    
    if (position_x === undefined || position_y === undefined) {
      return next(new ApiError(400, 'Position coordinates are required'));
    }
    
    if (width === undefined || height === undefined) {
      return next(new ApiError(400, 'Field dimensions are required'));
    }
    
    // Add field to document
    const fieldId = await addFieldToDocument(documentId, {
      name,
      field_type,
      template_id,
      properties,
      validation_rules,
      conditional_logic,
      page_number,
      position_x,
      position_y,
      width,
      height
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'field_added_to_document',
      metadata: {
        document_id: documentId,
        field_id: fieldId,
        field_name: name,
        field_type
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'Field added to document successfully',
      data: {
        field_id: fieldId
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update document field
 * @route   PUT /api/v1/documents/fields/:fieldId
 * @access  Private
 */
const updateDocumentFieldHandler = async (req, res, next) => {
  try {
    const { fieldId } = req.params;
    const {
      name,
      properties,
      validation_rules,
      conditional_logic,
      page_number,
      position_x,
      position_y,
      width,
      height
    } = req.body;
    
    const userId = req.user.id;
    
    // Update document field
    await updateDocumentField(fieldId, {
      name,
      properties,
      validation_rules,
      conditional_logic,
      page_number,
      position_x,
      position_y,
      width,
      height
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'document_field_updated',
      metadata: {
        field_id: fieldId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Document field updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete document field
 * @route   DELETE /api/v1/documents/fields/:fieldId
 * @access  Private
 */
const deleteDocumentFieldHandler = async (req, res, next) => {
  try {
    const { fieldId } = req.params;
    const userId = req.user.id;
    
    // Delete document field
    await deleteDocumentField(fieldId);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'document_field_deleted',
      metadata: {
        field_id: fieldId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Document field deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get document fields
 * @route   GET /api/v1/documents/:documentId/fields
 * @access  Private
 */
const getDocumentFieldsHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    
    // Get document fields
    const fields = await getDocumentFields(documentId);
    
    res.status(200).json({
      success: true,
      count: fields.length,
      data: fields
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Validate field value
 * @route   POST /api/v1/documents/fields/:fieldId/validate
 * @access  Private
 */
const validateFieldValueHandler = async (req, res, next) => {
  try {
    const { fieldId } = req.params;
    const { value } = req.body;
    
    // Validate field value
    const validationResult = await validateFieldValue(fieldId, value);
    
    res.status(200).json({
      success: true,
      data: validationResult
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Evaluate conditional logic
 * @route   POST /api/v1/documents/:documentId/evaluate-logic
 * @access  Private
 */
const evaluateConditionalLogicHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { field_values } = req.body;
    
    if (!field_values || typeof field_values !== 'object') {
      return next(new ApiError(400, 'Field values are required'));
    }
    
    // Evaluate conditional logic
    const visibilityMap = await evaluateConditionalLogic(documentId, field_values);
    
    res.status(200).json({
      success: true,
      data: visibilityMap
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Extract fields from document
 * @route   POST /api/v1/documents/:documentId/extract-fields
 * @access  Private
 */
const extractFieldsFromDocumentHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;
    
    // Extract fields from document
    const extractedFields = await extractFieldsFromDocument(documentId);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'fields_extracted_from_document',
      metadata: {
        document_id: documentId,
        field_count: extractedFields.length
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      count: extractedFields.length,
      data: extractedFields
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFieldTemplateHandler,
  updateFieldTemplateHandler,
  deleteFieldTemplateHandler,
  getFieldTemplateHandler,
  getFieldTemplatesHandler,
  addFieldToDocumentHandler,
  updateDocumentFieldHandler,
  deleteDocumentFieldHandler,
  getDocumentFieldsHandler,
  validateFieldValueHandler,
  evaluateConditionalLogicHandler,
  extractFieldsFromDocumentHandler
};
