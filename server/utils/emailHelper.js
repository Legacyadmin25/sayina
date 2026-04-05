/**
 * Email Helper
 *
 * Thin wrapper around emailService that provides a unified sendEmail interface
 * for use across utility modules and services.
 */

const { sendEmail } = require('../services/emailService');

module.exports = { sendEmail };
