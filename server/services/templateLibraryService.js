/**
 * Template Library Service
 * 
 * This service provides functionality for managing document templates in the Sayina E-Signature platform,
 * allowing users to create, share, and use reusable document templates.
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { logSystemEvent } = require('./loggerService');

/**
 * Create a document template
 * @param {string} orgId - Organization ID
 * @param {string} createdBy - User ID of creator
 * @param {Object} templateData - Template data
 * @param {Object} fileData - File data
 * @returns {Promise<string>} - Template ID
 */
const createDocumentTemplate = async (orgId, createdBy, templateData, fileData) => {
  try {
    const {
      name,
      description,
      category,
      fields = [],
      is_public = false,
      tags = []
    } = templateData;
    
    // Create upload directory if it doesn't exist
    const uploadDir = path.join(__dirname, '..', 'uploads', 'templates');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Save file
    const fileName = `${uuidv4()}_${fileData.originalname}`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, fileData.buffer);
    
    // Get file size
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    
    // Create template record
    const templateId = uuidv4();
    await db('document_templates').insert({
      id: templateId,
      org_id: orgId,
      created_by: createdBy,
      name,
      description: description || null,
      category: category || 'general',
      fields: JSON.stringify(fields),
      file_path: filePath,
      file_name: fileData.originalname,
      file_size: fileSize,
      file_type: fileData.mimetype,
      is_public,
      tags: JSON.stringify(tags),
      created_at: db.fn.now()
    });
    
    return templateId;
  } catch (error) {
    console.error('Error creating document template:', error);
    throw error;
  }
};

/**
 * Update document template
 * @param {string} templateId - Template ID
 * @param {Object} templateData - Updated template data
 * @returns {Promise<boolean>} - Success status
 */
const updateDocumentTemplate = async (templateId, templateData) => {
  try {
    const {
      name,
      description,
      category,
      fields,
      is_public,
      tags
    } = templateData;
    
    // Build update object
    const updateObj = {};
    
    if (name !== undefined) updateObj.name = name;
    if (description !== undefined) updateObj.description = description;
    if (category !== undefined) updateObj.category = category;
    if (fields !== undefined) updateObj.fields = JSON.stringify(fields);
    if (is_public !== undefined) updateObj.is_public = is_public;
    if (tags !== undefined) updateObj.tags = JSON.stringify(tags);
    
    updateObj.updated_at = db.fn.now();
    
    // Update template
    await db('document_templates')
      .where('id', templateId)
      .update(updateObj);
    
    return true;
  } catch (error) {
    console.error('Error updating document template:', error);
    throw error;
  }
};

/**
 * Update template file
 * @param {string} templateId - Template ID
 * @param {Object} fileData - New file data
 * @returns {Promise<boolean>} - Success status
 */
const updateTemplateFile = async (templateId, fileData) => {
  try {
    // Get template
    const template = await db('document_templates')
      .where('id', templateId)
      .first();
    
    if (!template) {
      throw new Error('Template not found');
    }
    
    // Delete old file if it exists
    if (template.file_path && fs.existsSync(template.file_path)) {
      fs.unlinkSync(template.file_path);
    }
    
    // Create upload directory if it doesn't exist
    const uploadDir = path.join(__dirname, '..', 'uploads', 'templates');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Save new file
    const fileName = `${uuidv4()}_${fileData.originalname}`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, fileData.buffer);
    
    // Get file size
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    
    // Update template
    await db('document_templates')
      .where('id', templateId)
      .update({
        file_path: filePath,
        file_name: fileData.originalname,
        file_size: fileSize,
        file_type: fileData.mimetype,
        updated_at: db.fn.now()
      });
    
    return true;
  } catch (error) {
    console.error('Error updating template file:', error);
    throw error;
  }
};

/**
 * Delete document template
 * @param {string} templateId - Template ID
 * @returns {Promise<boolean>} - Success status
 */
const deleteDocumentTemplate = async (templateId) => {
  try {
    // Get template
    const template = await db('document_templates')
      .where('id', templateId)
      .first();
    
    if (!template) {
      throw new Error('Template not found');
    }
    
    // Delete file if it exists
    if (template.file_path && fs.existsSync(template.file_path)) {
      fs.unlinkSync(template.file_path);
    }
    
    // Delete template
    await db('document_templates')
      .where('id', templateId)
      .delete();
    
    return true;
  } catch (error) {
    console.error('Error deleting document template:', error);
    throw error;
  }
};

/**
 * Get document template
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} - Template details
 */
const getDocumentTemplate = async (templateId) => {
  try {
    // Get template
    const template = await db('document_templates')
      .where('id', templateId)
      .first();
    
    if (!template) {
      throw new Error('Template not found');
    }
    
    // Get creator
    const creator = await db('users')
      .where('id', template.created_by)
      .select('id', 'first_name', 'last_name', 'email')
      .first();
    
    // Get usage count
    const usageCount = await db('template_usage')
      .where('template_id', templateId)
      .count('id as count')
      .first();
    
    return {
      id: template.id,
      org_id: template.org_id,
      name: template.name,
      description: template.description,
      category: template.category,
      fields: JSON.parse(template.fields),
      file_name: template.file_name,
      file_size: template.file_size,
      file_type: template.file_type,
      is_public: template.is_public,
      tags: JSON.parse(template.tags),
      created_by: creator,
      usage_count: usageCount.count,
      created_at: template.created_at,
      updated_at: template.updated_at
    };
  } catch (error) {
    console.error('Error getting document template:', error);
    throw error;
  }
};

/**
 * Get organization templates
 * @param {string} orgId - Organization ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Templates
 */
const getOrganizationTemplates = async (orgId, options = {}) => {
  try {
    const {
      category,
      search,
      tags,
      is_public,
      limit = 20,
      offset = 0
    } = options;
    
    // Build query
    let query = db('document_templates')
      .where('org_id', orgId);
    
    // Apply filters
    if (category) {
      query = query.where('category', category);
    }
    
    if (search) {
      query = query.where(function() {
        this.where('name', 'ilike', `%${search}%`)
            .orWhere('description', 'ilike', `%${search}%`);
      });
    }
    
    if (tags && tags.length > 0) {
      query = query.whereRaw(`tags ?| array[${tags.map(tag => `'${tag}'`).join(',')}]`);
    }
    
    if (is_public !== undefined) {
      query = query.where('is_public', is_public);
    }
    
    // Apply pagination
    query = query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    // Get templates
    const templates = await query;
    
    // Get creator IDs
    const creatorIds = [...new Set(templates.map(t => t.created_by))];
    
    // Get creators
    const creators = await db('users')
      .whereIn('id', creatorIds)
      .select('id', 'first_name', 'last_name');
    
    // Create creator lookup
    const creatorLookup = {};
    creators.forEach(creator => {
      creatorLookup[creator.id] = creator;
    });
    
    // Format templates
    return templates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      file_name: template.file_name,
      file_type: template.file_type,
      is_public: template.is_public,
      tags: JSON.parse(template.tags),
      created_by: creatorLookup[template.created_by] || { id: template.created_by },
      created_at: template.created_at
    }));
  } catch (error) {
    console.error('Error getting organization templates:', error);
    throw error;
  }
};

/**
 * Get template categories
 * @param {string} orgId - Organization ID
 * @returns {Promise<Array>} - Categories
 */
const getTemplateCategories = async (orgId) => {
  try {
    // Get distinct categories
    const categories = await db('document_templates')
      .where('org_id', orgId)
      .distinct('category');
    
    return categories.map(c => c.category);
  } catch (error) {
    console.error('Error getting template categories:', error);
    throw error;
  }
};

/**
 * Get template tags
 * @param {string} orgId - Organization ID
 * @returns {Promise<Array>} - Tags
 */
const getTemplateTags = async (orgId) => {
  try {
    // Get all tags
    const templates = await db('document_templates')
      .where('org_id', orgId)
      .select('tags');
    
    // Extract unique tags
    const allTags = [];
    templates.forEach(template => {
      const tags = JSON.parse(template.tags);
      allTags.push(...tags);
    });
    
    return [...new Set(allTags)];
  } catch (error) {
    console.error('Error getting template tags:', error);
    throw error;
  }
};

/**
 * Create envelope from template
 * @param {string} templateId - Template ID
 * @param {string} userId - User ID
 * @param {Object} envelopeData - Envelope data
 * @returns {Promise<string>} - Envelope ID
 */
const createEnvelopeFromTemplate = async (templateId, userId, envelopeData) => {
  try {
    // Get template
    const template = await getDocumentTemplate(templateId);
    
    // Get user
    const user = await db('users')
      .where('id', userId)
      .first();
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Create envelope
    const envelopeId = uuidv4();
    await db('envelopes').insert({
      id: envelopeId,
      org_id: user.org_id,
      name: envelopeData.name || template.name,
      description: envelopeData.description || template.description,
      status: 'draft',
      created_by: userId,
      created_at: db.fn.now()
    });
    
    // Create document from template
    const documentId = uuidv4();
    
    // Create document directory if it doesn't exist
    const documentDir = path.join(__dirname, '..', 'uploads', 'documents');
    if (!fs.existsSync(documentDir)) {
      fs.mkdirSync(documentDir, { recursive: true });
    }
    
    // Copy template file to document location
    const documentFileName = `${documentId}_${template.file_name}`;
    const documentFilePath = path.join(documentDir, documentFileName);
    fs.copyFileSync(template.file_path, documentFilePath);
    
    // Create document record
    await db('documents').insert({
      id: documentId,
      envelope_id: envelopeId,
      org_id: user.org_id,
      name: template.name,
      file_path: documentFilePath,
      file_name: template.file_name,
      file_size: template.file_size,
      file_type: template.file_type,
      status: 'draft',
      created_by: userId,
      created_at: db.fn.now()
    });
    
    // Record template usage
    await db('template_usage').insert({
      id: uuidv4(),
      template_id: templateId,
      envelope_id: envelopeId,
      document_id: documentId,
      user_id: userId,
      org_id: user.org_id,
      created_at: db.fn.now()
    });
    
    return envelopeId;
  } catch (error) {
    console.error('Error creating envelope from template:', error);
    throw error;
  }
};

/**
 * Get template usage history
 * @param {string} templateId - Template ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Usage history
 */
const getTemplateUsageHistory = async (templateId, options = {}) => {
  try {
    const {
      limit = 20,
      offset = 0
    } = options;
    
    // Get usage records
    const usageRecords = await db('template_usage')
      .where('template_id', templateId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    // Get user IDs
    const userIds = [...new Set(usageRecords.map(r => r.user_id))];
    
    // Get users
    const users = await db('users')
      .whereIn('id', userIds)
      .select('id', 'first_name', 'last_name', 'email');
    
    // Create user lookup
    const userLookup = {};
    users.forEach(user => {
      userLookup[user.id] = user;
    });
    
    // Get envelope IDs
    const envelopeIds = [...new Set(usageRecords.map(r => r.envelope_id))];
    
    // Get envelopes
    const envelopes = await db('envelopes')
      .whereIn('id', envelopeIds)
      .select('id', 'name', 'status');
    
    // Create envelope lookup
    const envelopeLookup = {};
    envelopes.forEach(envelope => {
      envelopeLookup[envelope.id] = envelope;
    });
    
    // Format usage records
    return usageRecords.map(record => ({
      id: record.id,
      user: userLookup[record.user_id] || { id: record.user_id },
      envelope: envelopeLookup[record.envelope_id] || { id: record.envelope_id },
      document_id: record.document_id,
      created_at: record.created_at
    }));
  } catch (error) {
    console.error('Error getting template usage history:', error);
    throw error;
  }
};

/**
 * Share template with organization
 * @param {string} templateId - Template ID
 * @returns {Promise<boolean>} - Success status
 */
const shareTemplateWithOrganization = async (templateId) => {
  try {
    // Update template
    await db('document_templates')
      .where('id', templateId)
      .update({
        is_public: true,
        updated_at: db.fn.now()
      });
    
    return true;
  } catch (error) {
    console.error('Error sharing template with organization:', error);
    throw error;
  }
};

/**
 * Make template private
 * @param {string} templateId - Template ID
 * @returns {Promise<boolean>} - Success status
 */
const makeTemplatePrivate = async (templateId) => {
  try {
    // Update template
    await db('document_templates')
      .where('id', templateId)
      .update({
        is_public: false,
        updated_at: db.fn.now()
      });
    
    return true;
  } catch (error) {
    console.error('Error making template private:', error);
    throw error;
  }
};

module.exports = {
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
};
