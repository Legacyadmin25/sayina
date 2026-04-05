/**
 * Application Configuration
 *
 * Centralises environment-variable–backed config values used across services.
 * All keys fall back to safe defaults so the server starts even when optional
 * third-party services (e.g. Azure Translator) are not yet configured.
 */

module.exports = {
  // Azure Cognitive Services – Translator
  azureTranslatorKey: process.env.AZURE_TRANSLATOR_KEY || '',
  azureTranslatorEndpoint: process.env.AZURE_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com',
  azureTranslatorRegion: process.env.AZURE_TRANSLATOR_REGION || 'southafricanorth',

  // Application
  appName: process.env.APP_NAME || 'Sayina',
  appUrl: process.env.APP_URL || 'https://sayina.co.za',
  apiUrl: process.env.API_URL || 'https://api.sayina.co.za',

  // JWT
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
};
