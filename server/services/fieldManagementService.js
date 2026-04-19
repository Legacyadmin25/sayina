/**
 * Field Management Service
 * 
 * This service provides functionality for managing form fields in the Sayina E-Signature platform,
 * including field templates, validation rules, and conditional logic.
 */

const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/db');
const { logSystemEvent } = require('./loggerService');

/**
 * Create field template
 * @param {string} orgId - Organization ID
 * @param {string} userId - User ID
 * @param {Object} templateData - Field template data
 * @returns {Promise<string>} - Field template ID
 */
const createFieldTemplate = async (orgId, userId, templateData) => {
  try {
    const {
      name,
      description,
      field_type,
      default_properties,
      validation_rules,
      category
    } = templateData;
    
    // Validate required fields
    if (!name || !field_type) {
      throw new Error('Name and field type are required');
    }
    
    // Create field template
    const templateId = uuidv4();
    await db('field_templates').insert({
      id: templateId,
      org_id: orgId,
      created_by: userId,
      name,
      description: description || null,
      field_type,
      default_properties: JSON.stringify(default_properties || {}),
      validation_rules: JSON.stringify(validation_rules || {}),
      category: category || 'general',
      created_at: db.fn.now()
    });
    
    return templateId;
  } catch (error) {
    console.error('Error creating field template:', error);
    throw error;
  }
};

/**
 * Update field template
 * @param {string} templateId - Field template ID
 * @param {Object} templateData - Updated field template data
 * @returns {Promise<boolean>} - Success status
 */
const updateFieldTemplate = async (templateId, templateData) => {
  try {
    const {
      name,
      description,
      field_type,
      default_properties,
      validation_rules,
      category,
      is_active
    } = templateData;
    
    // Build update object
    const updateObj = {};
    
    if (name !== undefined) updateObj.name = name;
    if (description !== undefined) updateObj.description = description;
    if (field_type !== undefined) updateObj.field_type = field_type;
    if (default_properties !== undefined) updateObj.default_properties = JSON.stringify(default_properties);
    if (validation_rules !== undefined) updateObj.validation_rules = JSON.stringify(validation_rules);
    if (category !== undefined) updateObj.category = category;
    if (is_active !== undefined) updateObj.is_active = is_active;
    
    updateObj.updated_at = db.fn.now();
    
    // Update field template
    await db('field_templates')
      .where('id', templateId)
      .update(updateObj);
    
    return true;
  } catch (error) {
    console.error('Error updating field template:', error);
    throw error;
  }
};

/**
 * Delete field template
 * @param {string} templateId - Field template ID
 * @returns {Promise<boolean>} - Success status
 */
const deleteFieldTemplate = async (templateId) => {
  try {
    // Check if template is in use
    const usageCount = await db('document_fields')
      .where('template_id', templateId)
      .count('id as count')
      .first();
    
    if (parseInt(usageCount.count) > 0) {
      throw new Error('Cannot delete template that is in use');
    }
    
    // Delete field template
    await db('field_templates')
      .where('id', templateId)
      .delete();
    
    return true;
  } catch (error) {
    console.error('Error deleting field template:', error);
    throw error;
  }
};

/**
 * Get field template
 * @param {string} templateId - Field template ID
 * @returns {Promise<Object>} - Field template details
 */
const getFieldTemplate = async (templateId) => {
  try {
    // Get template
    const template = await db('field_templates')
      .where('id', templateId)
      .first();
    
    if (!template) {
      throw new Error('Field template not found');
    }
    
    // Get creator
    const creator = await db('users')
      .where('id', template.created_by)
      .select('id', 'first_name', 'last_name', 'email')
      .first();
    
    // Format template
    return {
      id: template.id,
      org_id: template.org_id,
      name: template.name,
      description: template.description,
      field_type: template.field_type,
      default_properties: JSON.parse(template.default_properties),
      validation_rules: JSON.parse(template.validation_rules),
      category: template.category,
      is_active: template.is_active,
      created_by: creator,
      created_at: template.created_at,
      updated_at: template.updated_at
    };
  } catch (error) {
    console.error('Error getting field template:', error);
    throw error;
  }
};

/**
 * Get organization field templates
 * @param {string} orgId - Organization ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Field templates
 */
const getOrganizationFieldTemplates = async (orgId, options = {}) => {
  try {
    const {
      field_type,
      category,
      is_active,
      search,
      limit = 20,
      offset = 0
    } = options;
    
    // Build query
    let query = db('field_templates')
      .where('org_id', orgId);
    
    // Apply filters
    if (field_type) {
      query = query.where('field_type', field_type);
    }
    
    if (category) {
      query = query.where('category', category);
    }
    
    if (is_active !== undefined) {
      query = query.where('is_active', is_active);
    }
    
    if (search) {
      query = query.where(function() {
        this.where('name', 'ilike', `%${search}%`)
            .orWhere('description', 'ilike', `%${search}%`);
      });
    }
    
    // Apply pagination
    query = query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    // Get templates
    const templates = await query;
    
    // Format templates
    return templates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      field_type: template.field_type,
      category: template.category,
      is_active: template.is_active,
      created_at: template.created_at
    }));
  } catch (error) {
    console.error('Error getting organization field templates:', error);
    throw error;
  }
};

/**
 * Add field to document
 * @param {string} documentId - Document ID
 * @param {Object} fieldData - Field data
 * @returns {Promise<string>} - Field ID
 */
const addFieldToDocument = async (documentId, fieldData) => {
  try {
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
    } = fieldData;
    
    // Get document
    const document = await db('documents')
      .where('id', documentId)
      .first();
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Create field
    const fieldId = uuidv4();
    await db('document_fields').insert({
      id: fieldId,
      document_id: documentId,
      envelope_id: document.envelope_id,
      org_id: document.org_id,
      name,
      field_type,
      template_id: template_id || null,
      properties: JSON.stringify(properties || {}),
      validation_rules: JSON.stringify(validation_rules || {}),
      conditional_logic: JSON.stringify(conditional_logic || {}),
      page_number: page_number || 1,
      position_x,
      position_y,
      width,
      height,
      created_at: db.fn.now()
    });
    
    return fieldId;
  } catch (error) {
    console.error('Error adding field to document:', error);
    throw error;
  }
};

/**
 * Update document field
 * @param {string} fieldId - Field ID
 * @param {Object} fieldData - Updated field data
 * @returns {Promise<boolean>} - Success status
 */
const updateDocumentField = async (fieldId, fieldData) => {
  try {
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
    } = fieldData;
    
    // Build update object
    const updateObj = {};
    
    if (name !== undefined) updateObj.name = name;
    if (properties !== undefined) updateObj.properties = JSON.stringify(properties);
    if (validation_rules !== undefined) updateObj.validation_rules = JSON.stringify(validation_rules);
    if (conditional_logic !== undefined) updateObj.conditional_logic = JSON.stringify(conditional_logic);
    if (page_number !== undefined) updateObj.page_number = page_number;
    if (position_x !== undefined) updateObj.position_x = position_x;
    if (position_y !== undefined) updateObj.position_y = position_y;
    if (width !== undefined) updateObj.width = width;
    if (height !== undefined) updateObj.height = height;
    
    updateObj.updated_at = db.fn.now();
    
    // Update field
    await db('document_fields')
      .where('id', fieldId)
      .update(updateObj);
    
    return true;
  } catch (error) {
    console.error('Error updating document field:', error);
    throw error;
  }
};

/**
 * Delete document field
 * @param {string} fieldId - Field ID
 * @returns {Promise<boolean>} - Success status
 */
const deleteDocumentField = async (fieldId) => {
  try {
    // Delete field
    await db('document_fields')
      .where('id', fieldId)
      .delete();
    
    return true;
  } catch (error) {
    console.error('Error deleting document field:', error);
    throw error;
  }
};

/**
 * Get document fields
 * @param {string} documentId - Document ID
 * @returns {Promise<Array>} - Document fields
 */
const getDocumentFields = async (documentId) => {
  try {
    // Get fields
    const fields = await db('document_fields')
      .where('document_id', documentId)
      .orderBy('created_at', 'asc');
    
    // Format fields
    return fields.map(field => ({
      id: field.id,
      document_id: field.document_id,
      envelope_id: field.envelope_id,
      name: field.name,
      field_type: field.field_type,
      template_id: field.template_id,
      properties: JSON.parse(field.properties),
      validation_rules: JSON.parse(field.validation_rules),
      conditional_logic: JSON.parse(field.conditional_logic),
      page_number: field.page_number,
      position_x: field.position_x,
      position_y: field.position_y,
      width: field.width,
      height: field.height,
      created_at: field.created_at,
      updated_at: field.updated_at
    }));
  } catch (error) {
    console.error('Error getting document fields:', error);
    throw error;
  }
};

/**
 * Validate field value
 * @param {string} fieldId - Field ID
 * @param {*} value - Field value
 * @returns {Promise<Object>} - Validation result
 */
const validateFieldValue = async (fieldId, value) => {
  try {
    // Get field
    const field = await db('document_fields')
      .where('id', fieldId)
      .first();
    
    if (!field) {
      throw new Error('Field not found');
    }
    
    const validationRules = JSON.parse(field.validation_rules);
    const validationResult = {
      valid: true,
      errors: []
    };
    
    // Skip validation if no rules
    if (!validationRules || Object.keys(validationRules).length === 0) {
      return validationResult;
    }
    
    // Validate required
    if (validationRules.required && (value === null || value === undefined || value === '')) {
      validationResult.valid = false;
      validationResult.errors.push('This field is required');
    }
    
    // Validate by field type
    switch (field.field_type) {
      case 'text':
        // Validate min length
        if (validationRules.minLength && value.length < validationRules.minLength) {
          validationResult.valid = false;
          validationResult.errors.push(`Minimum length is ${validationRules.minLength} characters`);
        }
        
        // Validate max length
        if (validationRules.maxLength && value.length > validationRules.maxLength) {
          validationResult.valid = false;
          validationResult.errors.push(`Maximum length is ${validationRules.maxLength} characters`);
        }
        
        // Validate pattern
        if (validationRules.pattern && !new RegExp(validationRules.pattern).test(value)) {
          validationResult.valid = false;
          validationResult.errors.push(validationRules.patternMessage || 'Value does not match required pattern');
        }
        break;
        
      case 'number':
        const numValue = parseFloat(value);
        
        // Validate numeric
        if (isNaN(numValue)) {
          validationResult.valid = false;
          validationResult.errors.push('Value must be a number');
          break;
        }
        
        // Validate min value
        if (validationRules.min !== undefined && numValue < validationRules.min) {
          validationResult.valid = false;
          validationResult.errors.push(`Minimum value is ${validationRules.min}`);
        }
        
        // Validate max value
        if (validationRules.max !== undefined && numValue > validationRules.max) {
          validationResult.valid = false;
          validationResult.errors.push(`Maximum value is ${validationRules.max}`);
        }
        break;
        
      case 'date':
        const dateValue = new Date(value);
        
        // Validate date
        if (isNaN(dateValue.getTime())) {
          validationResult.valid = false;
          validationResult.errors.push('Value must be a valid date');
          break;
        }
        
        // Validate min date
        if (validationRules.minDate && new Date(validationRules.minDate) > dateValue) {
          validationResult.valid = false;
          validationResult.errors.push(`Date must be on or after ${validationRules.minDate}`);
        }
        
        // Validate max date
        if (validationRules.maxDate && new Date(validationRules.maxDate) < dateValue) {
          validationResult.valid = false;
          validationResult.errors.push(`Date must be on or before ${validationRules.maxDate}`);
        }
        break;
        
      case 'email':
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          validationResult.valid = false;
          validationResult.errors.push('Value must be a valid email address');
        }
        break;
        
      case 'phone':
        // Validate phone format
        const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
        if (!phoneRegex.test(value)) {
          validationResult.valid = false;
          validationResult.errors.push('Value must be a valid phone number');
        }
        break;
        
      case 'select':
        // Validate option exists
        const options = (JSON.parse(field.properties) || {}).options || [];
        const optionValues = options.map(opt => opt.value);
        
        if (!optionValues.includes(value)) {
          validationResult.valid = false;
          validationResult.errors.push('Selected option is not valid');
        }
        break;
    }
    
    return validationResult;
  } catch (error) {
    console.error('Error validating field value:', error);
    throw error;
  }
};

/**
 * Evaluate conditional logic
 * @param {string} documentId - Document ID
 * @param {Object} fieldValues - Field values
 * @returns {Promise<Object>} - Field visibility map
 */
const evaluateConditionalLogic = async (documentId, fieldValues) => {
  try {
    // Get all fields with conditional logic
    const fields = await db('document_fields')
      .where('document_id', documentId)
      .whereRaw("conditional_logic::text != '{}'::text")
      .select('id', 'conditional_logic');
    
    // No fields with conditional logic
    if (fields.length === 0) {
      return {};
    }
    
    const visibilityMap = {};
    
    // Evaluate each field's conditional logic
    for (const field of fields) {
      const conditionalLogic = JSON.parse(field.conditional_logic);
      
      // Skip if no conditions
      if (!conditionalLogic.conditions || conditionalLogic.conditions.length === 0) {
        visibilityMap[field.id] = true;
        continue;
      }
      
      // Evaluate conditions
      const conditionResults = conditionalLogic.conditions.map(condition => {
        const targetValue = fieldValues[condition.field_id];
        
        // Skip if target field value is not provided
        if (targetValue === undefined) {
          return true; // Default to true if we can't evaluate
        }
        
        switch (condition.operator) {
          case 'equals':
            return targetValue === condition.value;
          case 'not_equals':
            return targetValue !== condition.value;
          case 'contains':
            return targetValue.includes(condition.value);
          case 'not_contains':
            return !targetValue.includes(condition.value);
          case 'greater_than':
            return parseFloat(targetValue) > parseFloat(condition.value);
          case 'less_than':
            return parseFloat(targetValue) < parseFloat(condition.value);
          case 'is_empty':
            return targetValue === '' || targetValue === null || targetValue === undefined;
          case 'is_not_empty':
            return targetValue !== '' && targetValue !== null && targetValue !== undefined;
          default:
            return true;
        }
      });
      
      // Determine visibility based on logic type
      if (conditionalLogic.logic_type === 'and') {
        visibilityMap[field.id] = conditionResults.every(result => result);
      } else {
        visibilityMap[field.id] = conditionResults.some(result => result);
      }
    }
    
    return visibilityMap;
  } catch (error) {
    console.error('Error evaluating conditional logic:', error);
    throw error;
  }
};

/**
 * Extract fields from document
 * @param {string} documentId - Document ID
 * @returns {Promise<Array>} - Extracted fields
 */
const extractFieldsFromDocument = async (documentId) => {
  try {
    // Get document
    const document = await db('documents')
      .where('id', documentId)
      .first();
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // TODO: Implement OCR field extraction
    // This is a placeholder for future implementation
    // Would integrate with a service like AWS Textract or Google Document AI
    
    // For now, return empty array
    return [];
  } catch (error) {
    console.error('Error extracting fields from document:', error);
    throw error;
  }
};

module.exports = {
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
};
