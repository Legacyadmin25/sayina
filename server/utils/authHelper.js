/**
 * Auth Helper
 *
 * Provides authentication utility functions used primarily by test suites.
 */

const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT for a test/service user.
 * @param {Object} payload - Token payload (e.g. { id, email, role })
 * @param {string} [expiresIn='1h'] - Token expiry
 * @returns {string} Signed JWT string
 */
const generateAuthToken = (payload, expiresIn = '1h') => {
  const secret = process.env.JWT_SECRET || 'test-secret';
  return jwt.sign(payload, secret, { expiresIn });
};

module.exports = { generateAuthToken };
