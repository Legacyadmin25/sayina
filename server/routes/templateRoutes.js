const express = require('express');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const { documentUpload } = require('../utils/fileUpload');
const { validationErrorHandler } = require('../middleware/errorMiddleware');
const templateController = require('../controllers/templateController');

const router = express.Router();

/**
 * @route   POST /api/v1/templates
 * @desc    Create document template
 * @access  Private
 */
router.post(
  '/',
  protect,
  verifiedEmail,
  documentUpload.single('template'),
  templateController.createTemplate
);

/**
 * @route   GET /api/v1/templates
 * @desc    Get all templates for organization
 * @access  Private
 */
router.get(
  '/',
  protect,
  templateController.getTemplates
);

/**
 * @route   GET /api/v1/templates/:id
 * @desc    Get template by ID
 * @access  Private
 */
router.get(
  '/:id',
  protect,
  templateController.getTemplateById
);

/**
 * @route   PUT /api/v1/templates/:id
 * @desc    Update template
 * @access  Private
 */
router.put(
  '/:id',
  protect,
  verifiedEmail,
  templateController.updateTemplate
);

/**
 * @route   DELETE /api/v1/templates/:id
 * @desc    Delete template
 * @access  Private
 */
router.delete(
  '/:id',
  protect,
  verifiedEmail,
  templateController.deleteTemplate
);

/**
 * @route   POST /api/v1/templates/:id/fields
 * @desc    Add field to template
 * @access  Private
 */
router.post(
  '/:id/fields',
  protect,
  verifiedEmail,
  templateController.addTemplateField
);

/**
 * @route   PUT /api/v1/templates/fields/:fieldId
 * @desc    Update template field
 * @access  Private
 */
router.put(
  '/fields/:fieldId',
  protect,
  verifiedEmail,
  templateController.updateTemplateField
);

/**
 * @route   DELETE /api/v1/templates/fields/:fieldId
 * @desc    Delete template field
 * @access  Private
 */
router.delete(
  '/fields/:fieldId',
  protect,
  verifiedEmail,
  templateController.deleteTemplateField
);

/**
 * @route   POST /api/v1/templates/:id/create-envelope
 * @desc    Create envelope from template
 * @access  Private
 */
router.post(
  '/:id/create-envelope',
  protect,
  verifiedEmail,
  templateController.createEnvelopeFromTemplate
);

module.exports = router;
