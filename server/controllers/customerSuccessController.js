/**
 * Customer Success Controller
 * 
 * This controller handles customer success features including user onboarding,
 * tutorials, usage analytics, abandoned process follow-ups, and satisfaction measurement.
 */

const { ApiError } = require('../middleware/errorMiddleware');
const {
  createOnboardingWorkflow,
  updateWorkflowStepStatus,
  getOnboardingWorkflow,
  getUserActiveWorkflow,
  createTutorial,
  getTutorial,
  listTutorials,
  trackTutorialCompletion,
  createSatisfactionSurvey,
  getSurvey,
  submitSurveyResponse,
  trackAbandonedProcess,
  resolveAbandonedProcess,
  getCustomerSuccessAnalytics
} = require('../services/customerSuccessService');
const { logSystemEvent } = require('../services/loggerService');

/**
 * @desc    Create onboarding workflow for user
 * @route   POST /api/v1/customer-success/onboarding
 * @access  Private
 */
const createOnboardingWorkflowHandler = async (req, res, next) => {
  try {
    const userId = req.body.user_id || req.user.id;
    const orgId = req.user.org_id;
    const options = req.body.options || {};
    
    // Create workflow
    const workflow = await createOnboardingWorkflow(userId, orgId, options);
    
    // Log event
    await logSystemEvent({
      user_id: req.user.id,
      action: 'onboarding_workflow_created',
      metadata: {
        workflow_id: workflow.workflow_id,
        target_user_id: userId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'Onboarding workflow created successfully',
      data: workflow
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update workflow step status
 * @route   PUT /api/v1/customer-success/onboarding/:workflowId/steps/:stepId
 * @access  Private
 */
const updateWorkflowStepStatusHandler = async (req, res, next) => {
  try {
    const { workflowId, stepId } = req.params;
    const { status, completion_data } = req.body;
    
    // Validate required fields
    if (!status) {
      return next(new ApiError(400, 'Status is required'));
    }
    
    // Update step
    const result = await updateWorkflowStepStatus(workflowId, stepId, status, completion_data);
    
    // Log event
    await logSystemEvent({
      user_id: req.user.id,
      action: 'workflow_step_updated',
      metadata: {
        workflow_id: workflowId,
        step_id: stepId,
        status
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Workflow step updated successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get onboarding workflow
 * @route   GET /api/v1/customer-success/onboarding/:workflowId
 * @access  Private
 */
const getOnboardingWorkflowHandler = async (req, res, next) => {
  try {
    const { workflowId } = req.params;
    
    // Get workflow
    const workflow = await getOnboardingWorkflow(workflowId);
    
    res.status(200).json({
      success: true,
      data: workflow
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's active onboarding workflow
 * @route   GET /api/v1/customer-success/onboarding/active
 * @access  Private
 */
const getUserActiveWorkflowHandler = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.user.id;
    
    // Get active workflow
    const workflow = await getUserActiveWorkflow(userId);
    
    res.status(200).json({
      success: true,
      data: workflow
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create tutorial
 * @route   POST /api/v1/customer-success/tutorials
 * @access  Private (Admin)
 */
const createTutorialHandler = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      feature,
      content,
      status
    } = req.body;
    
    // Validate required fields
    if (!title || !category || !content) {
      return next(new ApiError(400, 'Title, category, and content are required'));
    }
    
    // Create tutorial
    const tutorial = await createTutorial({
      title,
      description,
      category,
      feature,
      content,
      status
    });
    
    // Log event
    await logSystemEvent({
      user_id: req.user.id,
      action: 'tutorial_created',
      metadata: {
        tutorial_id: tutorial.tutorial_id,
        title,
        category
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'Tutorial created successfully',
      data: tutorial
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get tutorial
 * @route   GET /api/v1/customer-success/tutorials/:tutorialId
 * @access  Private
 */
const getTutorialHandler = async (req, res, next) => {
  try {
    const { tutorialId } = req.params;
    
    // Get tutorial
    const tutorial = await getTutorial(tutorialId);
    
    res.status(200).json({
      success: true,
      data: tutorial
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    List tutorials
 * @route   GET /api/v1/customer-success/tutorials
 * @access  Private
 */
const listTutorialsHandler = async (req, res, next) => {
  try {
    const { category, feature } = req.query;
    
    // List tutorials
    const tutorials = await listTutorials({ category, feature });
    
    res.status(200).json({
      success: true,
      count: tutorials.length,
      data: tutorials
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Track tutorial completion
 * @route   POST /api/v1/customer-success/tutorials/:tutorialId/completion
 * @access  Private
 */
const trackTutorialCompletionHandler = async (req, res, next) => {
  try {
    const { tutorialId } = req.params;
    const userId = req.user.id;
    const {
      time_spent_seconds,
      feedback_rating,
      feedback_comment
    } = req.body;
    
    // Track completion
    const completion = await trackTutorialCompletion(userId, tutorialId, {
      time_spent_seconds,
      feedback_rating,
      feedback_comment
    });
    
    res.status(201).json({
      success: true,
      message: 'Tutorial completion tracked successfully',
      data: completion
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create satisfaction survey
 * @route   POST /api/v1/customer-success/surveys
 * @access  Private (Admin)
 */
const createSatisfactionSurveyHandler = async (req, res, next) => {
  try {
    const {
      title,
      description,
      trigger_event,
      questions,
      status,
      expiry_date
    } = req.body;
    
    // Validate required fields
    if (!title || !trigger_event || !questions) {
      return next(new ApiError(400, 'Title, trigger event, and questions are required'));
    }
    
    // Create survey
    const survey = await createSatisfactionSurvey({
      title,
      description,
      trigger_event,
      questions,
      status,
      expiry_date
    });
    
    // Log event
    await logSystemEvent({
      user_id: req.user.id,
      action: 'satisfaction_survey_created',
      metadata: {
        survey_id: survey.survey_id,
        title,
        trigger_event
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'Satisfaction survey created successfully',
      data: survey
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get survey
 * @route   GET /api/v1/customer-success/surveys/:surveyId
 * @access  Private
 */
const getSurveyHandler = async (req, res, next) => {
  try {
    const { surveyId } = req.params;
    
    // Get survey
    const survey = await getSurvey(surveyId);
    
    res.status(200).json({
      success: true,
      data: survey
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit survey response
 * @route   POST /api/v1/customer-success/surveys/:surveyId/responses
 * @access  Private
 */
const submitSurveyResponseHandler = async (req, res, next) => {
  try {
    const { surveyId } = req.params;
    const userId = req.user.id;
    const {
      answers,
      nps_score,
      additional_feedback
    } = req.body;
    
    // Validate required fields
    if (!answers) {
      return next(new ApiError(400, 'Answers are required'));
    }
    
    // Submit response
    const response = await submitSurveyResponse(surveyId, userId, {
      answers,
      nps_score,
      additional_feedback
    });
    
    res.status(201).json({
      success: true,
      message: 'Survey response submitted successfully',
      data: response
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Track abandoned process
 * @route   POST /api/v1/customer-success/abandoned-processes
 * @access  Private
 */
const trackAbandonedProcessHandler = async (req, res, next) => {
  try {
    const {
      user_id,
      process_type,
      process_id,
      metadata
    } = req.body;
    
    // Validate required fields
    if (!user_id || !process_type || !process_id) {
      return next(new ApiError(400, 'User ID, process type, and process ID are required'));
    }
    
    // Track abandoned process
    const tracking = await trackAbandonedProcess(user_id, process_type, process_id, metadata);
    
    // Log event
    await logSystemEvent({
      user_id: req.user.id,
      action: 'abandoned_process_tracked',
      metadata: {
        tracking_id: tracking.tracking_id,
        target_user_id: user_id,
        process_type,
        process_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'Abandoned process tracked successfully',
      data: tracking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resolve abandoned process
 * @route   PUT /api/v1/customer-success/abandoned-processes/:trackingId
 * @access  Private
 */
const resolveAbandonedProcessHandler = async (req, res, next) => {
  try {
    const { trackingId } = req.params;
    const { resolution, metadata } = req.body;
    
    // Validate required fields
    if (!resolution) {
      return next(new ApiError(400, 'Resolution is required'));
    }
    
    // Resolve abandoned process
    const result = await resolveAbandonedProcess(trackingId, resolution, metadata);
    
    // Log event
    await logSystemEvent({
      user_id: req.user.id,
      action: 'abandoned_process_resolved',
      metadata: {
        tracking_id: trackingId,
        resolution
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Abandoned process resolved successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get customer success analytics
 * @route   GET /api/v1/customer-success/analytics
 * @access  Private
 */
const getCustomerSuccessAnalyticsHandler = async (req, res, next) => {
  try {
    const orgId = req.user.org_id;
    const { start_date, end_date } = req.query;
    
    // Get analytics
    const analytics = await getCustomerSuccessAnalytics(orgId, {
      start_date,
      end_date
    });
    
    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Onboarding workflows
  createOnboardingWorkflowHandler,
  updateWorkflowStepStatusHandler,
  getOnboardingWorkflowHandler,
  getUserActiveWorkflowHandler,
  
  // Tutorials
  createTutorialHandler,
  getTutorialHandler,
  listTutorialsHandler,
  trackTutorialCompletionHandler,
  
  // Satisfaction surveys
  createSatisfactionSurveyHandler,
  getSurveyHandler,
  submitSurveyResponseHandler,
  
  // Abandoned processes
  trackAbandonedProcessHandler,
  resolveAbandonedProcessHandler,
  
  // Analytics
  getCustomerSuccessAnalyticsHandler
};
