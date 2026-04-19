/**
 * Document Validation Helper
 * 
 * This utility provides functions to validate document-related operations,
 * such as field placement and signing actions.
 */

const { ApiError } = require('../middleware/errorMiddleware');
const { db } = require('../config/db');

/**
 * Get PDF metadata for an envelope, including page dimensions
 * @param {string} envelopeId - Envelope ID
 * @returns {Promise<Object>} - PDF metadata
 */
const getEnvelopePdfMetadata = async (envelopeId) => {
  try {
    // Get documents in the envelope
    const documents = await db('documents')
      .where('envelope_id', envelopeId)
      .orderBy('order', 'asc');
    
    if (!documents || documents.length === 0) {
      throw new ApiError(404, 'No documents found in this envelope');
    }
    
    // Combine metadata from all documents
    const combinedMetadata = {
      totalPages: 0,
      pageSizes: [],
      documentMap: [] // Maps global page number to document ID and local page
    };
    
    for (const doc of documents) {
      // Parse document metadata
      const metadata = doc.metadata ? JSON.parse(doc.metadata) : {};
      const pageCount = metadata.pageCount || 0;
      const pageSizes = metadata.pageSizes || [];
      
      // Add page sizes to the combined metadata
      for (let i = 0; i < pageCount; i++) {
        combinedMetadata.pageSizes.push(pageSizes[i] || { width: 612, height: 792 }); // Default to US Letter if missing
        combinedMetadata.documentMap.push({
          documentId: doc.id,
          localPage: i + 1,
          globalPage: combinedMetadata.totalPages + i + 1
        });
      }
      
      // Update total page count
      combinedMetadata.totalPages += pageCount;
    }
    
    return combinedMetadata;
  } catch (error) {
    console.error('Error getting envelope PDF metadata:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to get envelope PDF metadata');
  }
};

/**
 * Validate field placement within document boundaries
 * @param {Object} field - Field data
 * @param {Array} pageSizes - Array of page sizes
 * @returns {Object} - Validation result
 */
const validateFieldPlacement = (field, pageSizes) => {
  // Get page index (0-based)
  const pageIndex = field.page - 1;
  
  // Check if page exists
  if (pageIndex < 0 || pageIndex >= pageSizes.length) {
    return {
      valid: false,
      message: `Invalid page number ${field.page}. The document has ${pageSizes.length} pages.`
    };
  }
  
  // Get page dimensions
  const pageSize = pageSizes[pageIndex];
  const { width: pageWidth, height: pageHeight } = pageSize;
  
  // Validate field position (x, y should be within page)
  if (field.x < 0 || field.y < 0) {
    return {
      valid: false,
      message: `Field position (${field.x}, ${field.y}) must be non-negative.`
    };
  }
  
  // Validate field size (width, height should be positive)
  if (field.width <= 0 || field.height <= 0) {
    return {
      valid: false,
      message: `Field dimensions (${field.width}, ${field.height}) must be positive.`
    };
  }
  
  // Check minimum dimensions based on field type
  const minDimensions = getMinFieldDimensions(field.type);
  if (field.width < minDimensions.width) {
    return {
      valid: false,
      message: `Field width (${field.width}) is too small. Minimum width for ${field.type} is ${minDimensions.width}.`
    };
  }
  
  if (field.height < minDimensions.height) {
    return {
      valid: false,
      message: `Field height (${field.height}) is too small. Minimum height for ${field.type} is ${minDimensions.height}.`
    };
  }
  
  // Validate field boundaries (should be within page)
  if (field.x + field.width > pageWidth) {
    return {
      valid: false,
      message: `Field extends beyond right page boundary. Max x-coordinate should be ${pageWidth - field.width}.`
    };
  }
  
  if (field.y + field.height > pageHeight) {
    return {
      valid: false,
      message: `Field extends beyond bottom page boundary. Max y-coordinate should be ${pageHeight - field.height}.`
    };
  }
  
  return {
    valid: true,
    message: 'Field placement is valid'
  };
};

/**
 * Get minimum dimensions for different field types
 * @param {string} fieldType - Field type
 * @returns {Object} - Minimum width and height
 */
const getMinFieldDimensions = (fieldType) => {
  switch (fieldType) {
    case 'signature':
      return { width: 120, height: 50 };
    case 'initial':
      return { width: 80, height: 40 };
    case 'text':
      return { width: 100, height: 30 };
    case 'date':
      return { width: 100, height: 30 };
    case 'checkbox':
      return { width: 20, height: 20 };
    case 'dropdown':
      return { width: 100, height: 30 };
    case 'radio':
      return { width: 20, height: 20 };
    case 'attachment':
      return { width: 150, height: 40 };
    default:
      return { width: 50, height: 20 };
  }
};

/**
 * Validate that a field can be assigned to a signer
 * @param {string} fieldId - Field ID
 * @param {string} signerId - Signer ID
 * @returns {Promise<boolean>} - True if assignment is valid
 */
const validateFieldAssignment = async (fieldId, signerId) => {
  try {
    // Get field details
    const field = await db('fields')
      .where('id', fieldId)
      .first();
    
    if (!field) {
      throw new ApiError(404, 'Field not found');
    }
    
    // Get envelope ID from field
    const documentId = field.document_id;
    
    // Get document details to get envelope ID
    const document = await db('documents')
      .where('id', documentId)
      .first();
    
    if (!document) {
      throw new ApiError(404, 'Document not found');
    }
    
    // Check if signer belongs to the envelope
    const signer = await db('signers')
      .where('id', signerId)
      .where('envelope_id', document.envelope_id)
      .first();
    
    if (!signer) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error validating field assignment:', error);
    return false;
  }
};

/**
 * Validate signer permissions for field values
 * @param {string} signerId - Signer ID
 * @param {Array} fieldValues - Array of field values
 * @returns {Promise<Object>} - Validation result
 */
const validateSignerFieldPermissions = async (signerId, fieldValues) => {
  try {
    // Get signer details
    const signer = await db('signers')
      .where('id', signerId)
      .first();
    
    if (!signer) {
      throw new ApiError(404, 'Signer not found');
    }
    
    // Get all fields assigned to this signer
    const assignedFields = await db('fields')
      .where('signer_id', signerId)
      .select('id');
    
    // Create a Set of assigned field IDs for efficient lookup
    const assignedFieldIds = new Set(assignedFields.map(field => field.id));
    
    // Validate each field value
    for (const fieldValue of fieldValues) {
      // Check if field is assigned to this signer
      if (!assignedFieldIds.has(fieldValue.field_id)) {
        return {
          valid: false,
          message: `Field ${fieldValue.field_id} is not assigned to this signer`,
          fieldId: fieldValue.field_id
        };
      }
    }
    
    return {
      valid: true,
      message: 'All fields are assigned to this signer'
    };
  } catch (error) {
    console.error('Error validating signer field permissions:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to validate signer field permissions');
  }
};

module.exports = {
  getEnvelopePdfMetadata,
  validateFieldPlacement,
  getMinFieldDimensions,
  validateFieldAssignment,
  validateSignerFieldPermissions
};
