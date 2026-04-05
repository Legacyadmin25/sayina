const express = require('express');
const { protect, verifiedEmail, checkRole } = require('../middleware/authMiddleware');
const integrationController = require('../controllers/integrationController');

const router = express.Router();

/**
 * @route   POST /api/v1/integrations
 * @desc    Create integration
 * @access  Private (org_admin)
 */
router.post(
  '/',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  integrationController.createIntegration
);

/**
 * @route   GET /api/v1/integrations
 * @desc    Get organization integrations
 * @access  Private (org_admin)
 */
router.get(
  '/',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  integrationController.getIntegrations
);

/**
 * @route   GET /api/v1/integrations/:id
 * @desc    Get integration details
 * @access  Private (org_admin)
 */
router.get(
  '/:id',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  integrationController.getIntegrationDetails
);

/**
 * @route   PUT /api/v1/integrations/:id
 * @desc    Update integration
 * @access  Private (org_admin)
 */
router.put(
  '/:id',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  integrationController.updateIntegrationDetails
);

/**
 * @route   DELETE /api/v1/integrations/:id
 * @desc    Delete integration
 * @access  Private (org_admin)
 */
router.delete(
  '/:id',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  integrationController.deleteIntegrationById
);

/**
 * @route   POST /api/v1/integrations/:id/test
 * @desc    Test integration connection
 * @access  Private (org_admin)
 */
router.post(
  '/:id/test',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  integrationController.testIntegrationConnection
);

/**
 * @route   POST /api/v1/integrations/:id/export/:documentId
 * @desc    Export document to integration
 * @access  Private (org_admin)
 */
router.post(
  '/:id/export/:documentId',
  protect,
  verifiedEmail,
  checkRole('org_admin'),
  integrationController.exportDocumentToIntegration
);

/**
 * @route   GET /api/v1/integrations/exports/:documentId
 * @desc    Get document exports
 * @access  Private
 */
router.get(
  '/exports/:documentId',
  protect,
  integrationController.getDocumentExports
);

/**
 * @route   GET /api/v1/integrations/types
 * @desc    Get available integration types
 * @access  Private
 */
router.get(
  '/types',
  protect,
  integrationController.getIntegrationTypes
);

module.exports = router;
