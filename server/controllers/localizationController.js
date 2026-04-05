/**
 * Localization Controller
 * 
 * This controller handles multi-language support features for the Sayina E-Signature platform.
 */

const { ApiError } = require('../middleware/errorMiddleware');
const {
  translate,
  getUserLanguage,
  setUserLanguage,
  getAvailableLanguages,
  translateDocumentContent,
  getOrganizationLanguageSettings,
  updateOrganizationLanguageSettings,
  getDocumentLanguage,
  setDocumentLanguage
} = require('../services/localizationService');
const { logSystemEvent } = require('../services/loggerService');

/**
 * @desc    Get available languages
 * @route   GET /api/v1/localization/languages
 * @access  Public
 */
const getAvailableLanguagesHandler = async (req, res, next) => {
  try {
    // Get languages
    const languages = getAvailableLanguages();
    
    res.status(200).json({
      success: true,
      count: languages.length,
      data: languages
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user language preference
 * @route   GET /api/v1/localization/user-language
 * @access  Private
 */
const getUserLanguageHandler = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get language
    const language = await getUserLanguage(userId);
    
    res.status(200).json({
      success: true,
      data: {
        language
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set user language preference
 * @route   PUT /api/v1/localization/user-language
 * @access  Private
 */
const setUserLanguageHandler = async (req, res, next) => {
  try {
    const { language } = req.body;
    const userId = req.user.id;
    
    // Validate required fields
    if (!language) {
      return next(new ApiError(400, 'Language is required'));
    }
    
    // Set language
    await setUserLanguage(userId, language);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'user_language_updated',
      metadata: {
        language
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'User language preference updated successfully',
      data: {
        language
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get organization language settings
 * @route   GET /api/v1/localization/organization-settings
 * @access  Private
 */
const getOrganizationLanguageSettingsHandler = async (req, res, next) => {
  try {
    const orgId = req.user.org_id;
    
    // Get settings
    const settings = await getOrganizationLanguageSettings(orgId);
    
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update organization language settings
 * @route   PUT /api/v1/localization/organization-settings
 * @access  Private
 */
const updateOrganizationLanguageSettingsHandler = async (req, res, next) => {
  try {
    const {
      default_language,
      enabled_languages,
      auto_translate
    } = req.body;
    
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Validate required fields
    if (!default_language || !enabled_languages) {
      return next(new ApiError(400, 'Default language and enabled languages are required'));
    }
    
    // Update settings
    await updateOrganizationLanguageSettings(orgId, {
      default_language,
      enabled_languages,
      auto_translate
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'organization_language_settings_updated',
      metadata: {
        default_language,
        enabled_languages,
        auto_translate
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Organization language settings updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get document language
 * @route   GET /api/v1/localization/documents/:documentId/language
 * @access  Private
 */
const getDocumentLanguageHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    
    // Get language
    const language = await getDocumentLanguage(documentId);
    
    res.status(200).json({
      success: true,
      data: {
        language
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set document language
 * @route   PUT /api/v1/localization/documents/:documentId/language
 * @access  Private
 */
const setDocumentLanguageHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { language } = req.body;
    
    const userId = req.user.id;
    
    // Validate required fields
    if (!language) {
      return next(new ApiError(400, 'Language is required'));
    }
    
    // Set language
    await setDocumentLanguage(documentId, language);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'document_language_updated',
      metadata: {
        document_id: documentId,
        language
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Document language updated successfully',
      data: {
        language
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Translate document content
 * @route   POST /api/v1/localization/translate-document
 * @access  Private
 */
const translateDocumentContentHandler = async (req, res, next) => {
  try {
    const {
      content,
      source_language,
      target_language
    } = req.body;
    
    const userId = req.user.id;
    
    // Validate required fields
    if (!content || !source_language || !target_language) {
      return next(new ApiError(400, 'Content, source language, and target language are required'));
    }
    
    // Translate content
    const translatedContent = await translateDocumentContent(
      content,
      source_language,
      target_language
    );
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'document_content_translated',
      metadata: {
        source_language,
        target_language
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      data: {
        translated_content: translatedContent
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get translations for UI
 * @route   GET /api/v1/localization/translations
 * @access  Public
 */
const getTranslationsHandler = async (req, res, next) => {
  try {
    const { language, namespace = 'common' } = req.query;
    
    // Get translations for namespace
    const translations = {};
    
    // In a real implementation, this would load translations from files or database
    // For demonstration purposes, we'll just return some sample translations
    if (namespace === 'common') {
      translations.welcome = translate('common.welcome', language);
      translations.login = translate('common.login', language);
      translations.logout = translate('common.logout', language);
      translations.register = translate('common.register', language);
      translations.dashboard = translate('common.dashboard', language);
      translations.settings = translate('common.settings', language);
    } else if (namespace === 'documents') {
      translations.upload = translate('documents.upload', language);
      translations.download = translate('documents.download', language);
      translations.sign = translate('documents.sign', language);
      translations.view = translate('documents.view', language);
      translations.delete = translate('documents.delete', language);
    }
    
    res.status(200).json({
      success: true,
      data: {
        namespace,
        language,
        translations
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAvailableLanguagesHandler,
  getUserLanguageHandler,
  setUserLanguageHandler,
  getOrganizationLanguageSettingsHandler,
  updateOrganizationLanguageSettingsHandler,
  getDocumentLanguageHandler,
  setDocumentLanguageHandler,
  translateDocumentContentHandler,
  getTranslationsHandler
};
