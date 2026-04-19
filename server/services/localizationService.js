/**
 * Localization Service
 * 
 * This service provides multi-language support for the Sayina E-Signature platform.
 */

const fs = require('fs');
const path = require('path');
const { db } = require('../config/db');

// Default language
const DEFAULT_LANGUAGE = 'en';

// Available languages
const AVAILABLE_LANGUAGES = ['en', 'af', 'zu', 'xh', 'st', 'tn', 'ts', 'ss', 've', 'nr'];

// Load language files
const loadLanguageFiles = () => {
  const translations = {};
  
  AVAILABLE_LANGUAGES.forEach(lang => {
    try {
      const filePath = path.join(__dirname, '..', 'locales', `${lang}.json`);
      if (fs.existsSync(filePath)) {
        translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } else {
        console.warn(`Language file not found: ${filePath}`);
        translations[lang] = {};
      }
    } catch (error) {
      console.error(`Error loading language file for ${lang}:`, error);
      translations[lang] = {};
    }
  });
  
  return translations;
};

// Initialize translations
const translations = loadLanguageFiles();

/**
 * Get translation for a key
 * @param {string} key - Translation key
 * @param {string} language - Language code
 * @param {Object} params - Parameters for interpolation
 * @returns {string} - Translated text
 */
const translate = (key, language = DEFAULT_LANGUAGE, params = {}) => {
  // Fallback to default language if requested language is not available
  if (!AVAILABLE_LANGUAGES.includes(language)) {
    language = DEFAULT_LANGUAGE;
  }
  
  // Get translation
  let translation = translations[language]?.[key] || translations[DEFAULT_LANGUAGE]?.[key] || key;
  
  // Interpolate parameters
  if (params && typeof params === 'object') {
    Object.keys(params).forEach(param => {
      translation = translation.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
    });
  }
  
  return translation;
};

/**
 * Get user language preference
 * @param {string} userId - User ID
 * @returns {Promise<string>} - Language code
 */
const getUserLanguage = async (userId) => {
  try {
    // Get user language preference
    const user = await db('users')
      .where('id', userId)
      .select('language')
      .first();
    
    return user?.language || DEFAULT_LANGUAGE;
  } catch (error) {
    console.error('Error getting user language:', error);
    return DEFAULT_LANGUAGE;
  }
};

/**
 * Set user language preference
 * @param {string} userId - User ID
 * @param {string} language - Language code
 * @returns {Promise<boolean>} - Success status
 */
const setUserLanguage = async (userId, language) => {
  try {
    // Validate language
    if (!AVAILABLE_LANGUAGES.includes(language)) {
      throw new Error(`Invalid language: ${language}`);
    }
    
    // Update user language preference
    await db('users')
      .where('id', userId)
      .update({
        language,
        updated_at: db.fn.now()
      });
    
    return true;
  } catch (error) {
    console.error('Error setting user language:', error);
    throw error;
  }
};

/**
 * Get available languages
 * @returns {Array} - Available languages
 */
const getAvailableLanguages = () => {
  return AVAILABLE_LANGUAGES.map(code => ({
    code,
    name: translate(`language.${code}`, DEFAULT_LANGUAGE)
  }));
};

/**
 * Translate document content
 * @param {string} content - Document content
 * @param {string} sourceLanguage - Source language
 * @param {string} targetLanguage - Target language
 * @returns {Promise<string>} - Translated content
 */
const translateDocumentContent = async (content, sourceLanguage, targetLanguage) => {
  try {
    // In a real implementation, this would use a translation API
    // For now, we'll just return the original content
    return content;
  } catch (error) {
    console.error('Error translating document content:', error);
    throw error;
  }
};

/**
 * Get organization language settings
 * @param {string} orgId - Organization ID
 * @returns {Promise<Object>} - Language settings
 */
const getOrganizationLanguageSettings = async (orgId) => {
  try {
    // Get organization settings
    const settings = await db('organization_settings')
      .where('org_id', orgId)
      .first();
    
    if (!settings || !settings.language_settings) {
      return {
        default_language: DEFAULT_LANGUAGE,
        enabled_languages: [DEFAULT_LANGUAGE],
        auto_translate: false
      };
    }
    
    return JSON.parse(settings.language_settings);
  } catch (error) {
    console.error('Error getting organization language settings:', error);
    throw error;
  }
};

/**
 * Update organization language settings
 * @param {string} orgId - Organization ID
 * @param {Object} settings - Language settings
 * @returns {Promise<boolean>} - Success status
 */
const updateOrganizationLanguageSettings = async (orgId, settings) => {
  try {
    const {
      default_language,
      enabled_languages,
      auto_translate
    } = settings;
    
    // Validate default language
    if (!AVAILABLE_LANGUAGES.includes(default_language)) {
      throw new Error(`Invalid default language: ${default_language}`);
    }
    
    // Validate enabled languages
    if (!Array.isArray(enabled_languages) || enabled_languages.length === 0) {
      throw new Error('At least one language must be enabled');
    }
    
    enabled_languages.forEach(lang => {
      if (!AVAILABLE_LANGUAGES.includes(lang)) {
        throw new Error(`Invalid language: ${lang}`);
      }
    });
    
    // Ensure default language is enabled
    if (!enabled_languages.includes(default_language)) {
      enabled_languages.push(default_language);
    }
    
    // Update organization settings
    const existingSettings = await db('organization_settings')
      .where('org_id', orgId)
      .first();
    
    if (existingSettings) {
      await db('organization_settings')
        .where('org_id', orgId)
        .update({
          language_settings: JSON.stringify({
            default_language,
            enabled_languages,
            auto_translate: !!auto_translate
          }),
          updated_at: db.fn.now()
        });
    } else {
      await db('organization_settings').insert({
        org_id: orgId,
        language_settings: JSON.stringify({
          default_language,
          enabled_languages,
          auto_translate: !!auto_translate
        }),
        created_at: db.fn.now()
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error updating organization language settings:', error);
    throw error;
  }
};

/**
 * Get document language
 * @param {string} documentId - Document ID
 * @returns {Promise<string>} - Language code
 */
const getDocumentLanguage = async (documentId) => {
  try {
    // Get document language
    const document = await db('envelope_documents')
      .where('id', documentId)
      .select('language')
      .first();
    
    return document?.language || DEFAULT_LANGUAGE;
  } catch (error) {
    console.error('Error getting document language:', error);
    return DEFAULT_LANGUAGE;
  }
};

/**
 * Set document language
 * @param {string} documentId - Document ID
 * @param {string} language - Language code
 * @returns {Promise<boolean>} - Success status
 */
const setDocumentLanguage = async (documentId, language) => {
  try {
    // Validate language
    if (!AVAILABLE_LANGUAGES.includes(language)) {
      throw new Error(`Invalid language: ${language}`);
    }
    
    // Update document language
    await db('envelope_documents')
      .where('id', documentId)
      .update({
        language,
        updated_at: db.fn.now()
      });
    
    return true;
  } catch (error) {
    console.error('Error setting document language:', error);
    throw error;
  }
};

module.exports = {
  translate,
  getUserLanguage,
  setUserLanguage,
  getAvailableLanguages,
  translateDocumentContent,
  getOrganizationLanguageSettings,
  updateOrganizationLanguageSettings,
  getDocumentLanguage,
  setDocumentLanguage
};
