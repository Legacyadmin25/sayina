/**
 * Temporary Key Routes
 * 
 * API routes for creating and managing temporary API keys
 * for envelope signing and other short-lived operations.
 */

const express = require('express');
const router = express.Router();
const tempKeyController = require('../controllers/tempKeyController');
const { authenticateApiKey, checkApiKeyPermissions } = require('../middleware/apiKeyMiddleware');
const { protect: authenticate } = require('../middleware/authMiddleware');

// Generate a temporary key for an envelope (accessible via API key or user authentication)
router.post(
  '/envelopes/:envelopeId/keys',
  [
    (req, res, next) => {
      // Allow either API key or session authentication
      const authHeader = req.headers['x-api-key'] || req.headers['api-key'];
      if (authHeader) {
        authenticateApiKey(req, res, next);
      } else {
        authenticate(req, res, next);
      }
    },
    checkApiKeyPermissions(['write:envelope', 'create:temp_key'])
  ],
  tempKeyController.createTemporaryKey
);

// Get all temporary keys for an envelope (API key or user authentication)
router.get(
  '/envelopes/:envelopeId/keys',
  [
    (req, res, next) => {
      const authHeader = req.headers['x-api-key'] || req.headers['api-key'];
      if (authHeader) {
        authenticateApiKey(req, res, next);
      } else {
        authenticate(req, res, next);
      }
    },
    checkApiKeyPermissions(['read:envelope', 'read:temp_key'])
  ],
  tempKeyController.getEnvelopeTemporaryKeys
);

// Invalidate a temporary key (API key or user authentication)
router.delete(
  '/keys/:keyId',
  [
    (req, res, next) => {
      const authHeader = req.headers['x-api-key'] || req.headers['api-key'];
      if (authHeader) {
        authenticateApiKey(req, res, next);
      } else {
        authenticate(req, res, next);
      }
    },
    checkApiKeyPermissions(['write:envelope', 'delete:temp_key'])
  ],
  tempKeyController.invalidateTemporaryKey
);

// Admin route for cleaning up all expired keys
router.post(
  '/keys/cleanup',
  [
    authenticate,
    (req, res, next) => {
      if (req.user.role === 'admin') {
        next();
      } else {
        res.status(403).json({
          status: 'error',
          message: 'Only administrators can perform this action'
        });
      }
    }
  ],
  tempKeyController.cleanupAllExpiredKeys
);

module.exports = router;
