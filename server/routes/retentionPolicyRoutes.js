const express = require('express');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const retentionPolicyController = require('../controllers/retentionPolicyController');

const router = express.Router();

/**
 * @route   POST /api/v1/retention/policies
 * @desc    Create a retention policy
 * @access  Private
 */
router.post(
  '/policies',
  protect,
  verifiedEmail,
  retentionPolicyController.createPolicy
);

/**
 * @route   PUT /api/v1/retention/policies/:id
 * @desc    Update a retention policy
 * @access  Private
 */
router.put(
  '/policies/:id',
  protect,
  verifiedEmail,
  retentionPolicyController.updatePolicy
);

/**
 * @route   DELETE /api/v1/retention/policies/:id
 * @desc    Delete a retention policy
 * @access  Private
 */
router.delete(
  '/policies/:id',
  protect,
  verifiedEmail,
  retentionPolicyController.deletePolicy
);

/**
 * @route   GET /api/v1/retention/policies/:id
 * @desc    Get a retention policy
 * @access  Private
 */
router.get(
  '/policies/:id',
  protect,
  retentionPolicyController.getPolicyById
);

/**
 * @route   GET /api/v1/retention/policies
 * @desc    Get organization retention policies
 * @access  Private
 */
router.get(
  '/policies',
  protect,
  retentionPolicyController.getOrgPolicies
);

/**
 * @route   POST /api/v1/retention/apply/document
 * @desc    Apply retention policy to document
 * @access  Private
 */
router.post(
  '/apply/document',
  protect,
  verifiedEmail,
  retentionPolicyController.applyPolicyToDocument
);

/**
 * @route   POST /api/v1/retention/apply/envelope
 * @desc    Apply retention policy to envelope
 * @access  Private
 */
router.post(
  '/apply/envelope',
  protect,
  verifiedEmail,
  retentionPolicyController.applyPolicyToEnvelope
);

/**
 * @route   DELETE /api/v1/retention/document/:documentId
 * @desc    Remove retention policy from document
 * @access  Private
 */
router.delete(
  '/document/:documentId',
  protect,
  verifiedEmail,
  retentionPolicyController.removePolicyFromDocument
);

/**
 * @route   GET /api/v1/retention/document/:documentId
 * @desc    Get document retention details
 * @access  Private
 */
router.get(
  '/document/:documentId',
  protect,
  retentionPolicyController.getDocumentRetentionDetails
);

/**
 * @route   GET /api/v1/retention/expiring
 * @desc    Get documents expiring soon
 * @access  Private
 */
router.get(
  '/expiring',
  protect,
  retentionPolicyController.getExpiringDocuments
);

/**
 * @route   POST /api/v1/retention/process-expired
 * @desc    Process expired documents
 * @access  Private
 */
router.post(
  '/process-expired',
  protect,
  verifiedEmail,
  retentionPolicyController.processExpired
);

/**
 * @route   POST /api/v1/retention/auto-apply
 * @desc    Auto-apply retention policies
 * @access  Private
 */
router.post(
  '/auto-apply',
  protect,
  verifiedEmail,
  retentionPolicyController.autoApplyPolicies
);

module.exports = router;
