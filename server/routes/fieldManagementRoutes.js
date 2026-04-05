const express = require('express');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const fieldManagementController = require('../controllers/fieldManagementController');

const router = express.Router();

/**
 * Field Template Routes
 */

/**
 * @route   POST /api/v1/fields/templates
 * @desc    Create field template
 * @access  Private
 */
router.post(
  '/templates',
  protect,
  verifiedEmail,
  fieldManagementController.createFieldTemplateHandler
);

/**
 * @route   PUT /api/v1/fields/templates/:id
 * @desc    Update field template
 * @access  Private
 */
router.put(
  '/templates/:id',
  protect,
  verifiedEmail,
  fieldManagementController.updateFieldTemplateHandler
);

/**
 * @route   DELETE /api/v1/fields/templates/:id
 * @desc    Delete field template
 * @access  Private
 */
router.delete(
  '/templates/:id',
  protect,
  verifiedEmail,
  fieldManagementController.deleteFieldTemplateHandler
);

/**
 * @route   GET /api/v1/fields/templates/:id
 * @desc    Get field template
 * @access  Private
 */
router.get(
  '/templates/:id',
  protect,
  fieldManagementController.getFieldTemplateHandler
);

/**
 * @route   GET /api/v1/fields/templates
 * @desc    Get organization field templates
 * @access  Private
 */
router.get(
  '/templates',
  protect,
  fieldManagementController.getFieldTemplatesHandler
);

/**
 * Document Field Routes
 */

/**
 * @route   POST /api/v1/fields/documents/:documentId/fields
 * @desc    Add field to document
 * @access  Private
 */
router.post(
  '/documents/:documentId/fields',
  protect,
  verifiedEmail,
  fieldManagementController.addFieldToDocumentHandler
);

/**
 * @route   PUT /api/v1/fields/documents/fields/:fieldId
 * @desc    Update document field
 * @access  Private
 */
router.put(
  '/documents/fields/:fieldId',
  protect,
  verifiedEmail,
  fieldManagementController.updateDocumentFieldHandler
);

/**
 * @route   DELETE /api/v1/fields/documents/fields/:fieldId
 * @desc    Delete document field
 * @access  Private
 */
router.delete(
  '/documents/fields/:fieldId',
  protect,
  verifiedEmail,
  fieldManagementController.deleteDocumentFieldHandler
);

/**
 * @route   GET /api/v1/fields/documents/:documentId/fields
 * @desc    Get document fields
 * @access  Private
 */
router.get(
  '/documents/:documentId/fields',
  protect,
  fieldManagementController.getDocumentFieldsHandler
);

/**
 * Field Validation and Logic Routes
 */

/**
 * @route   POST /api/v1/fields/documents/fields/:fieldId/validate
 * @desc    Validate field value
 * @access  Private
 */
router.post(
  '/documents/fields/:fieldId/validate',
  protect,
  fieldManagementController.validateFieldValueHandler
);

/**
 * @route   POST /api/v1/fields/documents/:documentId/evaluate-logic
 * @desc    Evaluate conditional logic
 * @access  Private
 */
router.post(
  '/documents/:documentId/evaluate-logic',
  protect,
  fieldManagementController.evaluateConditionalLogicHandler
);

/**
 * @route   POST /api/v1/fields/documents/:documentId/extract-fields
 * @desc    Extract fields from document
 * @access  Private
 */
router.post(
  '/documents/:documentId/extract-fields',
  protect,
  verifiedEmail,
  fieldManagementController.extractFieldsFromDocumentHandler
);

module.exports = router;
