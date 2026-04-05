const express = require('express');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const templateLibraryController = require('../controllers/templateLibraryController');

const router = express.Router();

/**
 * @route   POST /api/v1/templates/library
 * @desc    Create a document template
 * @access  Private
 */
router.post(
  '/',
  protect,
  verifiedEmail,
  templateLibraryController.createTemplate
);

/**
 * @route   PUT /api/v1/templates/library/:id
 * @desc    Update document template
 * @access  Private
 */
router.put(
  '/:id',
  protect,
  verifiedEmail,
  templateLibraryController.updateTemplate
);

/**
 * @route   PUT /api/v1/templates/library/:id/file
 * @desc    Update template file
 * @access  Private
 */
router.put(
  '/:id/file',
  protect,
  verifiedEmail,
  templateLibraryController.updateTemplateFileHandler
);

/**
 * @route   DELETE /api/v1/templates/library/:id
 * @desc    Delete document template
 * @access  Private
 */
router.delete(
  '/:id',
  protect,
  verifiedEmail,
  templateLibraryController.deleteTemplate
);

/**
 * @route   GET /api/v1/templates/library/:id
 * @desc    Get document template
 * @access  Private
 */
router.get(
  '/:id',
  protect,
  templateLibraryController.getTemplate
);

/**
 * @route   GET /api/v1/templates/library
 * @desc    Get organization templates
 * @access  Private
 */
router.get(
  '/',
  protect,
  templateLibraryController.getTemplates
);

/**
 * @route   GET /api/v1/templates/library/categories
 * @desc    Get template categories
 * @access  Private
 */
router.get(
  '/categories',
  protect,
  templateLibraryController.getCategories
);

/**
 * @route   GET /api/v1/templates/library/tags
 * @desc    Get template tags
 * @access  Private
 */
router.get(
  '/tags',
  protect,
  templateLibraryController.getTags
);

/**
 * @route   POST /api/v1/templates/library/:id/create-envelope
 * @desc    Create envelope from template
 * @access  Private
 */
router.post(
  '/:id/create-envelope',
  protect,
  verifiedEmail,
  templateLibraryController.createEnvelopeFromTemplateHandler
);

/**
 * @route   GET /api/v1/templates/library/:id/usage
 * @desc    Get template usage history
 * @access  Private
 */
router.get(
  '/:id/usage',
  protect,
  templateLibraryController.getUsageHistory
);

/**
 * @route   POST /api/v1/templates/library/:id/share
 * @desc    Share template with organization
 * @access  Private
 */
router.post(
  '/:id/share',
  protect,
  verifiedEmail,
  templateLibraryController.shareTemplate
);

/**
 * @route   POST /api/v1/templates/library/:id/make-private
 * @desc    Make template private
 * @access  Private
 */
router.post(
  '/:id/make-private',
  protect,
  verifiedEmail,
  templateLibraryController.makePrivate
);

/**
 * @route   GET /api/v1/templates/library/:id/download
 * @desc    Download template file
 * @access  Private
 */
router.get(
  '/:id/download',
  protect,
  templateLibraryController.downloadTemplate
);

module.exports = router;
