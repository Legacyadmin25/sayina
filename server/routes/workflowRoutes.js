const express = require('express');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const workflowController = require('../controllers/workflowController');

const router = express.Router();

/**
 * @route   POST /api/v1/workflows/templates
 * @desc    Create a workflow template
 * @access  Private
 */
router.post(
  '/templates',
  protect,
  verifiedEmail,
  workflowController.createTemplate
);

/**
 * @route   PUT /api/v1/workflows/templates/:id
 * @desc    Update workflow template
 * @access  Private
 */
router.put(
  '/templates/:id',
  protect,
  verifiedEmail,
  workflowController.updateTemplate
);

/**
 * @route   DELETE /api/v1/workflows/templates/:id
 * @desc    Delete workflow template
 * @access  Private
 */
router.delete(
  '/templates/:id',
  protect,
  verifiedEmail,
  workflowController.deleteTemplate
);

/**
 * @route   GET /api/v1/workflows/templates/:id
 * @desc    Get workflow template
 * @access  Private
 */
router.get(
  '/templates/:id',
  protect,
  workflowController.getTemplate
);

/**
 * @route   GET /api/v1/workflows/templates
 * @desc    Get organization workflow templates
 * @access  Private
 */
router.get(
  '/templates',
  protect,
  workflowController.getTemplates
);

/**
 * @route   POST /api/v1/workflows
 * @desc    Create a workflow
 * @access  Private
 */
router.post(
  '/',
  protect,
  verifiedEmail,
  workflowController.createWorkflowInstance
);

/**
 * @route   GET /api/v1/workflows/:id
 * @desc    Get workflow details
 * @access  Private
 */
router.get(
  '/:id',
  protect,
  workflowController.getWorkflowDetails
);

/**
 * @route   GET /api/v1/workflows/envelope/:envelopeId
 * @desc    Get envelope workflow
 * @access  Private
 */
router.get(
  '/envelope/:envelopeId',
  protect,
  workflowController.getEnvelopeWorkflowDetails
);

/**
 * @route   POST /api/v1/workflows/:id/start
 * @desc    Start workflow
 * @access  Private
 */
router.post(
  '/:id/start',
  protect,
  verifiedEmail,
  workflowController.startWorkflowInstance
);

/**
 * @route   POST /api/v1/workflows/:id/steps/:stepNumber/complete
 * @desc    Complete workflow step
 * @access  Private
 */
router.post(
  '/:id/steps/:stepNumber/complete',
  protect,
  verifiedEmail,
  workflowController.completeStep
);

/**
 * @route   GET /api/v1/workflows/tasks
 * @desc    Get user's workflow tasks
 * @access  Private
 */
router.get(
  '/tasks',
  protect,
  workflowController.getUserTasks
);

/**
 * @route   POST /api/v1/workflows/:id/cancel
 * @desc    Cancel workflow
 * @access  Private
 */
router.post(
  '/:id/cancel',
  protect,
  verifiedEmail,
  workflowController.cancelWorkflowInstance
);

module.exports = router;
