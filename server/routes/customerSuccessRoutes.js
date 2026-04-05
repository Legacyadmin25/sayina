const express = require('express');
const { protect, verifiedEmail, admin } = require('../middleware/authMiddleware');
const customerSuccessController = require('../controllers/customerSuccessController');

const router = express.Router();

/**
 * Onboarding Workflow Routes
 */

/**
 * @route   POST /api/v1/customer-success/onboarding
 * @desc    Create onboarding workflow for user
 * @access  Private
 */
router.post(
  '/onboarding',
  protect,
  verifiedEmail,
  customerSuccessController.createOnboardingWorkflowHandler
);

/**
 * @route   PUT /api/v1/customer-success/onboarding/:workflowId/steps/:stepId
 * @desc    Update workflow step status
 * @access  Private
 */
router.put(
  '/onboarding/:workflowId/steps/:stepId',
  protect,
  customerSuccessController.updateWorkflowStepStatusHandler
);

/**
 * @route   GET /api/v1/customer-success/onboarding/:workflowId
 * @desc    Get onboarding workflow
 * @access  Private
 */
router.get(
  '/onboarding/:workflowId',
  protect,
  customerSuccessController.getOnboardingWorkflowHandler
);

/**
 * @route   GET /api/v1/customer-success/onboarding/active
 * @desc    Get user's active onboarding workflow
 * @access  Private
 */
router.get(
  '/onboarding/active',
  protect,
  customerSuccessController.getUserActiveWorkflowHandler
);

/**
 * Tutorial Routes
 */

/**
 * @route   POST /api/v1/customer-success/tutorials
 * @desc    Create tutorial
 * @access  Private (Admin)
 */
router.post(
  '/tutorials',
  protect,
  verifiedEmail,
  admin,
  customerSuccessController.createTutorialHandler
);

/**
 * @route   GET /api/v1/customer-success/tutorials/:tutorialId
 * @desc    Get tutorial
 * @access  Private
 */
router.get(
  '/tutorials/:tutorialId',
  protect,
  customerSuccessController.getTutorialHandler
);

/**
 * @route   GET /api/v1/customer-success/tutorials
 * @desc    List tutorials
 * @access  Private
 */
router.get(
  '/tutorials',
  protect,
  customerSuccessController.listTutorialsHandler
);

/**
 * @route   POST /api/v1/customer-success/tutorials/:tutorialId/completion
 * @desc    Track tutorial completion
 * @access  Private
 */
router.post(
  '/tutorials/:tutorialId/completion',
  protect,
  customerSuccessController.trackTutorialCompletionHandler
);

/**
 * Satisfaction Survey Routes
 */

/**
 * @route   POST /api/v1/customer-success/surveys
 * @desc    Create satisfaction survey
 * @access  Private (Admin)
 */
router.post(
  '/surveys',
  protect,
  verifiedEmail,
  admin,
  customerSuccessController.createSatisfactionSurveyHandler
);

/**
 * @route   GET /api/v1/customer-success/surveys/:surveyId
 * @desc    Get survey
 * @access  Private
 */
router.get(
  '/surveys/:surveyId',
  protect,
  customerSuccessController.getSurveyHandler
);

/**
 * @route   POST /api/v1/customer-success/surveys/:surveyId/responses
 * @desc    Submit survey response
 * @access  Private
 */
router.post(
  '/surveys/:surveyId/responses',
  protect,
  customerSuccessController.submitSurveyResponseHandler
);

/**
 * Abandoned Process Routes
 */

/**
 * @route   POST /api/v1/customer-success/abandoned-processes
 * @desc    Track abandoned process
 * @access  Private
 */
router.post(
  '/abandoned-processes',
  protect,
  verifiedEmail,
  customerSuccessController.trackAbandonedProcessHandler
);

/**
 * @route   PUT /api/v1/customer-success/abandoned-processes/:trackingId
 * @desc    Resolve abandoned process
 * @access  Private
 */
router.put(
  '/abandoned-processes/:trackingId',
  protect,
  customerSuccessController.resolveAbandonedProcessHandler
);

/**
 * Analytics Routes
 */

/**
 * @route   GET /api/v1/customer-success/analytics
 * @desc    Get customer success analytics
 * @access  Private
 */
router.get(
  '/analytics',
  protect,
  verifiedEmail,
  customerSuccessController.getCustomerSuccessAnalyticsHandler
);

module.exports = router;
