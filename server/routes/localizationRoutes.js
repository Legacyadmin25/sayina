const express = require('express');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const localizationController = require('../controllers/localizationController');

const router = express.Router();

/**
 * Language Management Routes
 */

/**
 * @route   GET /api/v1/localization/languages
 * @desc    Get available languages
 * @access  Public
 */
router.get(
  '/languages',
  localizationController.getAvailableLanguagesHandler
);

/**
 * User Language Preference Routes
 */

/**
 * @route   GET /api/v1/localization/user-language
 * @desc    Get user language preference
 * @access  Private
 */
router.get(
  '/user-language',
  protect,
  localizationController.getUserLanguageHandler
);

/**
 * @route   PUT /api/v1/localization/user-language
 * @desc    Set user language preference
 * @access  Private
 */
router.put(
  '/user-language',
  protect,
  localizationController.setUserLanguageHandler
);

/**
 * Organization Language Settings Routes
 */

/**
 * @route   GET /api/v1/localization/organization-settings
 * @desc    Get organization language settings
 * @access  Private
 */
router.get(
  '/organization-settings',
  protect,
  localizationController.getOrganizationLanguageSettingsHandler
);

/**
 * @route   PUT /api/v1/localization/organization-settings
 * @desc    Update organization language settings
 * @access  Private
 */
router.put(
  '/organization-settings',
  protect,
  verifiedEmail,
  localizationController.updateOrganizationLanguageSettingsHandler
);

/**
 * Document Language Routes
 */

/**
 * @route   GET /api/v1/localization/documents/:documentId/language
 * @desc    Get document language
 * @access  Private
 */
router.get(
  '/documents/:documentId/language',
  protect,
  localizationController.getDocumentLanguageHandler
);

/**
 * @route   PUT /api/v1/localization/documents/:documentId/language
 * @desc    Set document language
 * @access  Private
 */
router.put(
  '/documents/:documentId/language',
  protect,
  localizationController.setDocumentLanguageHandler
);

/**
 * Translation Routes
 */

/**
 * @route   POST /api/v1/localization/translate-document
 * @desc    Translate document content
 * @access  Private
 */
router.post(
  '/translate-document',
  protect,
  localizationController.translateDocumentContentHandler
);

/**
 * @route   GET /api/v1/localization/translations
 * @desc    Get translations for UI
 * @access  Public
 */
router.get(
  '/translations',
  localizationController.getTranslationsHandler
);

module.exports = router;
