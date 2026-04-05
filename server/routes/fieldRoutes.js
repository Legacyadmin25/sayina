const express = require('express');
const { body, param } = require('express-validator');
const { protect, verifiedEmail, optionalAuth } = require('../middleware/authMiddleware');
const { validationErrorHandler } = require('../middleware/errorMiddleware');
const fieldController = require('../controllers/fieldController');

const router = express.Router();

/**
 * @route   POST /api/v1/fields
 * @desc    Add field to document
 * @access  Private
 */
router.post(
  '/',
  protect,
  verifiedEmail,
  [
    body('document_id').isUUID().withMessage('Invalid document ID format'),
    body('envelope_id').isUUID().withMessage('Invalid envelope ID format'),
    body('signer_id').optional().isUUID().withMessage('Invalid signer ID format'),
    body('type').notEmpty().withMessage('Field type is required'),
    body('page').isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    body('x_position').isNumeric().withMessage('X position must be a number'),
    body('y_position').isNumeric().withMessage('Y position must be a number'),
    body('width').isNumeric().withMessage('Width must be a number'),
    body('height').isNumeric().withMessage('Height must be a number'),
    body('required').optional().isBoolean().withMessage('Required must be a boolean'),
    body('label').optional(),
    body('value').optional(),
    body('font_size').optional().isInt({ min: 8, max: 72 }).withMessage('Font size must be between 8 and 72'),
    body('font_family').optional(),
    body('validation_pattern').optional(),
    body('validation_message').optional(),
    validationErrorHandler
  ],
  fieldController.addField
);

/**
 * @route   PUT /api/v1/fields/:id
 * @desc    Update field
 * @access  Private
 */
router.put(
  '/:id',
  protect,
  verifiedEmail,
  [
    param('id').isUUID().withMessage('Invalid field ID format'),
    body('signer_id').optional().isUUID().withMessage('Invalid signer ID format'),
    body('x_position').optional().isNumeric().withMessage('X position must be a number'),
    body('y_position').optional().isNumeric().withMessage('Y position must be a number'),
    body('width').optional().isNumeric().withMessage('Width must be a number'),
    body('height').optional().isNumeric().withMessage('Height must be a number'),
    body('required').optional().isBoolean().withMessage('Required must be a boolean'),
    body('label').optional(),
    body('value').optional(),
    body('font_size').optional().isInt({ min: 8, max: 72 }).withMessage('Font size must be between 8 and 72'),
    body('font_family').optional(),
    body('validation_pattern').optional(),
    body('validation_message').optional(),
    validationErrorHandler
  ],
  fieldController.updateField
);

/**
 * @route   DELETE /api/v1/fields/:id
 * @desc    Delete field
 * @access  Private
 */
router.delete(
  '/:id',
  protect,
  verifiedEmail,
  [
    param('id').isUUID().withMessage('Invalid field ID format'),
    validationErrorHandler
  ],
  fieldController.deleteField
);

/**
 * @route   GET /api/v1/fields/document/:documentId
 * @desc    Get fields for document
 * @access  Private
 */
router.get(
  '/document/:documentId',
  protect,
  [
    param('documentId').isUUID().withMessage('Invalid document ID format'),
    validationErrorHandler
  ],
  fieldController.getDocumentFields
);

/**
 * @route   GET /api/v1/fields/document/:documentId/signer/:signerId
 * @desc    Get fields for signer in document
 * @access  Private
 */
router.get(
  '/document/:documentId/signer/:signerId',
  protect,
  [
    param('documentId').isUUID().withMessage('Invalid document ID format'),
    param('signerId').isUUID().withMessage('Invalid signer ID format'),
    validationErrorHandler
  ],
  fieldController.getSignerFields
);

/**
 * @route   POST /api/v1/fields/submit
 * @desc    Submit field values
 * @access  Public (with token validation)
 */
router.post(
  '/submit',
  optionalAuth,
  [
    body('envelope_id').isUUID().withMessage('Invalid envelope ID format'),
    body('signer_id').isUUID().withMessage('Invalid signer ID format'),
    body('fields').isArray().withMessage('Fields must be an array'),
    body('fields.*.id').isUUID().withMessage('Invalid field ID format'),
    body('fields.*.value').notEmpty().withMessage('Field value is required'),
    validationErrorHandler
  ],
  fieldController.submitFieldValues
);

module.exports = router;
