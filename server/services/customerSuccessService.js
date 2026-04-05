/**
 * Customer Success Service
 * 
 * This service handles customer success features including user onboarding,
 * tutorials, usage analytics, abandoned process follow-ups, and satisfaction measurement.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { sendEmail } = require('../utils/emailHelper');
const { sendSms } = require('../utils/smsHelper');
const { logSystemEvent } = require('./loggerService');

/**
 * Create an onboarding workflow for a new user
 * @param {string} userId - User ID
 * @param {string} orgId - Organization ID
 * @param {Object} options - Workflow options
 * @returns {Object} Created workflow details
 */
const createOnboardingWorkflow = async (userId, orgId, options = {}) => {
  try {
    const workflowId = uuidv4();
    const currentDate = new Date();
    
    // Default workflow steps
    const defaultSteps = [
      {
        id: uuidv4(),
        name: 'account_setup',
        title: 'Complete Your Account Setup',
        description: 'Update your profile and organization details',
        status: 'pending',
        order: 1,
        completion_criteria: { profile_completed: true, org_details_completed: true }
      },
      {
        id: uuidv4(),
        name: 'first_document',
        title: 'Upload Your First Document',
        description: 'Upload a document and prepare it for signing',
        status: 'pending',
        order: 2,
        completion_criteria: { document_uploaded: true }
      },
      {
        id: uuidv4(),
        name: 'add_signers',
        title: 'Add Signers to a Document',
        description: 'Add recipients and assign signing fields',
        status: 'pending',
        order: 3,
        completion_criteria: { signers_added: true, fields_assigned: true }
      },
      {
        id: uuidv4(),
        name: 'send_envelope',
        title: 'Send Your First Envelope',
        description: 'Send a document for signature',
        status: 'pending',
        order: 4,
        completion_criteria: { envelope_sent: true }
      },
      {
        id: uuidv4(),
        name: 'explore_features',
        title: 'Explore Advanced Features',
        description: 'Discover templates, bulk sending, and more',
        status: 'pending',
        order: 5,
        completion_criteria: { features_explored: true }
      }
    ];
    
    // Merge with custom steps if provided
    const steps = options.custom_steps || defaultSteps;
    
    // Create workflow record
    const workflow = {
      id: workflowId,
      user_id: userId,
      org_id: orgId,
      name: options.name || 'Standard Onboarding',
      description: options.description || 'Step-by-step guide to get started with Sayina',
      steps: JSON.stringify(steps),
      status: 'active',
      progress: 0,
      created_at: currentDate,
      updated_at: currentDate,
      completed_at: null,
      expiry_date: options.expiry_days ? new Date(currentDate.getTime() + options.expiry_days * 24 * 60 * 60 * 1000) : null
    };
    
    await db('onboarding_workflows').insert(workflow);
    
    // Schedule initial welcome email
    await scheduleOnboardingCommunication(userId, workflowId, 'welcome_email');
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'onboarding_workflow_created',
      metadata: {
        workflow_id: workflowId,
        org_id: orgId
      }
    });
    
    return {
      workflow_id: workflowId,
      name: workflow.name,
      steps: steps,
      status: workflow.status
    };
  } catch (error) {
    console.error('Error creating onboarding workflow:', error);
    throw new Error('Failed to create onboarding workflow');
  }
};

/**
 * Update onboarding workflow step status
 * @param {string} workflowId - Workflow ID
 * @param {string} stepId - Step ID
 * @param {string} status - New status
 * @param {Object} completionData - Data related to step completion
 * @returns {Object} Updated workflow details
 */
const updateWorkflowStepStatus = async (workflowId, stepId, status, completionData = {}) => {
  try {
    // Get current workflow
    const workflowRecord = await db('onboarding_workflows').where('id', workflowId).first();
    
    if (!workflowRecord) {
      throw new Error('Workflow not found');
    }
    
    const steps = JSON.parse(workflowRecord.steps);
    const stepIndex = steps.findIndex(step => step.id === stepId);
    
    if (stepIndex === -1) {
      throw new Error('Step not found in workflow');
    }
    
    // Update step status
    steps[stepIndex].status = status;
    steps[stepIndex].completed_at = status === 'completed' ? new Date() : null;
    steps[stepIndex].completion_data = completionData;
    
    // Calculate new progress percentage
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    const progress = Math.round((completedSteps / steps.length) * 100);
    
    // Update workflow record
    const updateData = {
      steps: JSON.stringify(steps),
      progress,
      updated_at: new Date()
    };
    
    // If all steps are completed, mark workflow as completed
    if (progress === 100) {
      updateData.status = 'completed';
      updateData.completed_at = new Date();
      
      // Send completion email
      await scheduleOnboardingCommunication(workflowRecord.user_id, workflowId, 'onboarding_completed');
    }
    
    await db('onboarding_workflows').where('id', workflowId).update(updateData);
    
    // If step was completed, check if we should send a congratulation and next step
    if (status === 'completed') {
      await scheduleOnboardingCommunication(workflowRecord.user_id, workflowId, 'step_completed', { 
        step_id: stepId,
        step_name: steps[stepIndex].name
      });
      
      // If there's a next step, send notification about it
      if (stepIndex < steps.length - 1) {
        await scheduleOnboardingCommunication(workflowRecord.user_id, workflowId, 'next_step', {
          next_step_id: steps[stepIndex + 1].id,
          next_step_name: steps[stepIndex + 1].name
        });
      }
    }
    
    return {
      workflow_id: workflowId,
      updated_step: steps[stepIndex],
      progress,
      status: updateData.status || workflowRecord.status
    };
  } catch (error) {
    console.error('Error updating workflow step:', error);
    throw new Error('Failed to update workflow step');
  }
};

/**
 * Get onboarding workflow details
 * @param {string} workflowId - Workflow ID
 * @returns {Object} Workflow details
 */
const getOnboardingWorkflow = async (workflowId) => {
  try {
    const workflow = await db('onboarding_workflows').where('id', workflowId).first();
    
    if (!workflow) {
      throw new Error('Workflow not found');
    }
    
    return {
      ...workflow,
      steps: JSON.parse(workflow.steps)
    };
  } catch (error) {
    console.error('Error getting onboarding workflow:', error);
    throw new Error('Failed to get onboarding workflow');
  }
};

/**
 * Get user's active onboarding workflow
 * @param {string} userId - User ID
 * @returns {Object} Active workflow or null if none exists
 */
const getUserActiveWorkflow = async (userId) => {
  try {
    const workflow = await db('onboarding_workflows')
      .where('user_id', userId)
      .where('status', 'active')
      .orderBy('created_at', 'desc')
      .first();
    
    if (!workflow) {
      return null;
    }
    
    return {
      ...workflow,
      steps: JSON.parse(workflow.steps)
    };
  } catch (error) {
    console.error('Error getting user active workflow:', error);
    throw new Error('Failed to get user active workflow');
  }
};

/**
 * Schedule onboarding communication
 * @param {string} userId - User ID
 * @param {string} workflowId - Workflow ID
 * @param {string} type - Communication type
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Scheduled communication details
 */
const scheduleOnboardingCommunication = async (userId, workflowId, type, metadata = {}) => {
  try {
    const communicationId = uuidv4();
    const currentDate = new Date();
    
    // Determine send time based on type
    let sendTime = new Date();
    switch (type) {
      case 'welcome_email':
        // Send immediately
        break;
      case 'step_completed':
        // Send after 5 minutes
        sendTime = new Date(currentDate.getTime() + 5 * 60 * 1000);
        break;
      case 'next_step':
        // Send after 1 hour
        sendTime = new Date(currentDate.getTime() + 60 * 60 * 1000);
        break;
      case 'reminder':
        // Send after 1 day
        sendTime = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'onboarding_completed':
        // Send after 30 minutes
        sendTime = new Date(currentDate.getTime() + 30 * 60 * 1000);
        break;
      default:
        // Default to immediate
        break;
    }
    
    // Create communication record
    const communication = {
      id: communicationId,
      user_id: userId,
      workflow_id: workflowId,
      type,
      status: 'scheduled',
      metadata: JSON.stringify(metadata),
      scheduled_time: sendTime,
      sent_time: null,
      created_at: currentDate
    };
    
    await db('onboarding_communications').insert(communication);
    
    return {
      communication_id: communicationId,
      type,
      scheduled_time: sendTime
    };
  } catch (error) {
    console.error('Error scheduling onboarding communication:', error);
    throw new Error('Failed to schedule onboarding communication');
  }
};

/**
 * Create an interactive tutorial
 * @param {Object} tutorialData - Tutorial data
 * @returns {Object} Created tutorial details
 */
const createTutorial = async (tutorialData) => {
  try {
    const tutorialId = uuidv4();
    const currentDate = new Date();
    
    // Create tutorial record
    const tutorial = {
      id: tutorialId,
      title: tutorialData.title,
      description: tutorialData.description,
      category: tutorialData.category,
      feature: tutorialData.feature,
      content: JSON.stringify(tutorialData.content),
      status: tutorialData.status || 'active',
      created_at: currentDate,
      updated_at: currentDate
    };
    
    await db('tutorials').insert(tutorial);
    
    return {
      tutorial_id: tutorialId,
      title: tutorial.title,
      category: tutorial.category,
      feature: tutorial.feature,
      status: tutorial.status
    };
  } catch (error) {
    console.error('Error creating tutorial:', error);
    throw new Error('Failed to create tutorial');
  }
};

/**
 * Get tutorial details
 * @param {string} tutorialId - Tutorial ID
 * @returns {Object} Tutorial details
 */
const getTutorial = async (tutorialId) => {
  try {
    const tutorial = await db('tutorials').where('id', tutorialId).first();
    
    if (!tutorial) {
      throw new Error('Tutorial not found');
    }
    
    return {
      ...tutorial,
      content: JSON.parse(tutorial.content)
    };
  } catch (error) {
    console.error('Error getting tutorial:', error);
    throw new Error('Failed to get tutorial');
  }
};

/**
 * List tutorials by category or feature
 * @param {Object} filters - Filter options
 * @returns {Array} List of tutorials
 */
const listTutorials = async (filters = {}) => {
  try {
    const query = db('tutorials').where('status', 'active');
    
    if (filters.category) {
      query.where('category', filters.category);
    }
    
    if (filters.feature) {
      query.where('feature', filters.feature);
    }
    
    const tutorials = await query.select('id', 'title', 'description', 'category', 'feature', 'created_at');
    
    return tutorials;
  } catch (error) {
    console.error('Error listing tutorials:', error);
    throw new Error('Failed to list tutorials');
  }
};

/**
 * Track tutorial completion
 * @param {string} userId - User ID
 * @param {string} tutorialId - Tutorial ID
 * @param {Object} completionData - Completion data
 * @returns {Object} Completion record
 */
const trackTutorialCompletion = async (userId, tutorialId, completionData = {}) => {
  try {
    const completionId = uuidv4();
    const currentDate = new Date();
    
    // Create completion record
    const completion = {
      id: completionId,
      user_id: userId,
      tutorial_id: tutorialId,
      completed_at: currentDate,
      time_spent_seconds: completionData.time_spent_seconds || 0,
      feedback_rating: completionData.feedback_rating,
      feedback_comment: completionData.feedback_comment,
      created_at: currentDate
    };
    
    await db('tutorial_completions').insert(completion);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'tutorial_completed',
      metadata: {
        tutorial_id: tutorialId,
        completion_id: completionId,
        feedback_rating: completionData.feedback_rating
      }
    });
    
    return {
      completion_id: completionId,
      tutorial_id: tutorialId,
      completed_at: currentDate,
      feedback_rating: completionData.feedback_rating
    };
  } catch (error) {
    console.error('Error tracking tutorial completion:', error);
    throw new Error('Failed to track tutorial completion');
  }
};

/**
 * Create a satisfaction survey
 * @param {Object} surveyData - Survey data
 * @returns {Object} Created survey details
 */
const createSatisfactionSurvey = async (surveyData) => {
  try {
    const surveyId = uuidv4();
    const currentDate = new Date();
    
    // Create survey record
    const survey = {
      id: surveyId,
      title: surveyData.title,
      description: surveyData.description,
      trigger_event: surveyData.trigger_event,
      questions: JSON.stringify(surveyData.questions),
      status: surveyData.status || 'active',
      created_at: currentDate,
      updated_at: currentDate,
      expiry_date: surveyData.expiry_date || null
    };
    
    await db('satisfaction_surveys').insert(survey);
    
    return {
      survey_id: surveyId,
      title: survey.title,
      trigger_event: survey.trigger_event,
      status: survey.status
    };
  } catch (error) {
    console.error('Error creating satisfaction survey:', error);
    throw new Error('Failed to create satisfaction survey');
  }
};

/**
 * Get survey details
 * @param {string} surveyId - Survey ID
 * @returns {Object} Survey details
 */
const getSurvey = async (surveyId) => {
  try {
    const survey = await db('satisfaction_surveys').where('id', surveyId).first();
    
    if (!survey) {
      throw new Error('Survey not found');
    }
    
    return {
      ...survey,
      questions: JSON.parse(survey.questions)
    };
  } catch (error) {
    console.error('Error getting survey:', error);
    throw new Error('Failed to get survey');
  }
};

/**
 * Submit survey response
 * @param {string} surveyId - Survey ID
 * @param {string} userId - User ID
 * @param {Object} responseData - Response data
 * @returns {Object} Response details
 */
const submitSurveyResponse = async (surveyId, userId, responseData) => {
  try {
    const responseId = uuidv4();
    const currentDate = new Date();
    
    // Create response record
    const response = {
      id: responseId,
      survey_id: surveyId,
      user_id: userId,
      answers: JSON.stringify(responseData.answers),
      nps_score: responseData.nps_score,
      additional_feedback: responseData.additional_feedback,
      submitted_at: currentDate,
      created_at: currentDate
    };
    
    await db('survey_responses').insert(response);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'survey_submitted',
      metadata: {
        survey_id: surveyId,
        response_id: responseId,
        nps_score: responseData.nps_score
      }
    });
    
    return {
      response_id: responseId,
      survey_id: surveyId,
      submitted_at: currentDate
    };
  } catch (error) {
    console.error('Error submitting survey response:', error);
    throw new Error('Failed to submit survey response');
  }
};

/**
 * Track abandoned process
 * @param {string} userId - User ID
 * @param {string} processType - Process type
 * @param {string} processId - Process ID
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Tracking record
 */
const trackAbandonedProcess = async (userId, processType, processId, metadata = {}) => {
  try {
    const trackingId = uuidv4();
    const currentDate = new Date();
    
    // Create tracking record
    const tracking = {
      id: trackingId,
      user_id: userId,
      process_type: processType,
      process_id: processId,
      metadata: JSON.stringify(metadata),
      status: 'identified',
      identified_at: currentDate,
      follow_up_scheduled: false,
      follow_up_sent_at: null,
      resolved_at: null,
      created_at: currentDate,
      updated_at: currentDate
    };
    
    await db('abandoned_processes').insert(tracking);
    
    // Schedule follow-up based on process type
    let followUpDelay = 24; // Default 24 hours
    
    switch (processType) {
      case 'envelope_creation':
        followUpDelay = 4; // 4 hours
        break;
      case 'document_signing':
        followUpDelay = 12; // 12 hours
        break;
      case 'account_setup':
        followUpDelay = 48; // 48 hours
        break;
      default:
        followUpDelay = 24; // 24 hours
        break;
    }
    
    // Schedule follow-up
    await scheduleAbandonedProcessFollowUp(trackingId, followUpDelay);
    
    return {
      tracking_id: trackingId,
      process_type: processType,
      process_id: processId,
      status: tracking.status
    };
  } catch (error) {
    console.error('Error tracking abandoned process:', error);
    throw new Error('Failed to track abandoned process');
  }
};

/**
 * Schedule follow-up for abandoned process
 * @param {string} trackingId - Tracking ID
 * @param {number} delayHours - Delay in hours
 * @returns {Object} Updated tracking record
 */
const scheduleAbandonedProcessFollowUp = async (trackingId, delayHours = 24) => {
  try {
    const currentDate = new Date();
    const followUpTime = new Date(currentDate.getTime() + delayHours * 60 * 60 * 1000);
    
    // Update tracking record
    await db('abandoned_processes')
      .where('id', trackingId)
      .update({
        follow_up_scheduled: true,
        follow_up_time: followUpTime,
        updated_at: currentDate
      });
    
    return {
      tracking_id: trackingId,
      follow_up_scheduled: true,
      follow_up_time: followUpTime
    };
  } catch (error) {
    console.error('Error scheduling abandoned process follow-up:', error);
    throw new Error('Failed to schedule abandoned process follow-up');
  }
};

/**
 * Send follow-up for abandoned process
 * @param {string} trackingId - Tracking ID
 * @returns {Object} Updated tracking record
 */
const sendAbandonedProcessFollowUp = async (trackingId) => {
  try {
    // Get tracking record
    const tracking = await db('abandoned_processes').where('id', trackingId).first();
    
    if (!tracking) {
      throw new Error('Abandoned process tracking not found');
    }
    
    // Get user details
    const user = await db('users').where('id', tracking.user_id).first();
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const metadata = JSON.parse(tracking.metadata);
    const currentDate = new Date();
    
    // Prepare follow-up message based on process type
    let subject, message;
    
    switch (tracking.process_type) {
      case 'envelope_creation':
        subject = 'Complete your envelope on Sayina';
        message = `Hi ${user.first_name}, we noticed you started creating an envelope but didn't complete it. Need help?`;
        break;
      case 'document_signing':
        subject = 'Complete your signature on Sayina';
        message = `Hi ${user.first_name}, you have a document waiting for your signature. Would you like to complete it now?`;
        break;
      case 'account_setup':
        subject = 'Complete your Sayina account setup';
        message = `Hi ${user.first_name}, your Sayina account is almost ready. Just a few more steps to complete your setup.`;
        break;
      default:
        subject = 'Continue your process on Sayina';
        message = `Hi ${user.first_name}, we noticed you didn't complete a process on Sayina. Need assistance?`;
        break;
    }
    
    // Send email
    await sendEmail({
      to: user.email,
      subject,
      text: message,
      html: `<p>${message}</p><p><a href="${process.env.FRONTEND_URL}/resume/${tracking.process_type}/${tracking.process_id}">Continue where you left off</a></p>`
    });
    
    // If user has phone, send SMS
    if (user.phone) {
      await sendSms({
        to: user.phone,
        message: `${message} ${process.env.FRONTEND_URL}/resume/${tracking.process_type}/${tracking.process_id}`
      });
    }
    
    // Update tracking record
    await db('abandoned_processes')
      .where('id', trackingId)
      .update({
        status: 'followed_up',
        follow_up_sent_at: currentDate,
        updated_at: currentDate
      });
    
    // Log event
    await logSystemEvent({
      user_id: tracking.user_id,
      action: 'abandoned_process_follow_up_sent',
      metadata: {
        tracking_id: trackingId,
        process_type: tracking.process_type,
        process_id: tracking.process_id
      }
    });
    
    return {
      tracking_id: trackingId,
      status: 'followed_up',
      follow_up_sent_at: currentDate
    };
  } catch (error) {
    console.error('Error sending abandoned process follow-up:', error);
    throw new Error('Failed to send abandoned process follow-up');
  }
};

/**
 * Resolve abandoned process
 * @param {string} trackingId - Tracking ID
 * @param {string} resolution - Resolution type
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Updated tracking record
 */
const resolveAbandonedProcess = async (trackingId, resolution, metadata = {}) => {
  try {
    const currentDate = new Date();
    
    // Update tracking record
    await db('abandoned_processes')
      .where('id', trackingId)
      .update({
        status: 'resolved',
        resolution,
        resolution_metadata: JSON.stringify(metadata),
        resolved_at: currentDate,
        updated_at: currentDate
      });
    
    return {
      tracking_id: trackingId,
      status: 'resolved',
      resolution,
      resolved_at: currentDate
    };
  } catch (error) {
    console.error('Error resolving abandoned process:', error);
    throw new Error('Failed to resolve abandoned process');
  }
};

/**
 * Get usage analytics for customer success
 * @param {string} orgId - Organization ID
 * @param {Object} filters - Filter options
 * @returns {Object} Usage analytics
 */
const getCustomerSuccessAnalytics = async (orgId, filters = {}) => {
  try {
    const startDate = filters.start_date ? new Date(filters.start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = filters.end_date ? new Date(filters.end_date) : new Date();
    
    // Get envelope statistics
    const envelopeStats = await db('envelopes')
      .where('org_id', orgId)
      .whereBetween('created_at', [startDate, endDate])
      .select(
        db.raw('COUNT(*) as total_count'),
        db.raw('SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed_count'),
        db.raw('SUM(CASE WHEN status = "in_progress" THEN 1 ELSE 0 END) as in_progress_count'),
        db.raw('SUM(CASE WHEN status = "declined" THEN 1 ELSE 0 END) as declined_count'),
        db.raw('AVG(TIMESTAMPDIFF(HOUR, created_at, completed_at)) as avg_completion_time')
      )
      .first();
    
    // Get user activity statistics
    const userStats = await db('users')
      .where('org_id', orgId)
      .select(
        db.raw('COUNT(*) as total_users'),
        db.raw('SUM(CASE WHEN last_login_at > DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as active_users_7d'),
        db.raw('SUM(CASE WHEN last_login_at > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as active_users_30d')
      )
      .first();
    
    // Get onboarding statistics
    const onboardingStats = await db('onboarding_workflows')
      .where('org_id', orgId)
      .whereBetween('created_at', [startDate, endDate])
      .select(
        db.raw('COUNT(*) as total_workflows'),
        db.raw('SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed_workflows'),
        db.raw('AVG(progress) as avg_progress')
      )
      .first();
    
    // Get satisfaction statistics
    const satisfactionStats = await db('survey_responses')
      .join('users', 'survey_responses.user_id', '=', 'users.id')
      .where('users.org_id', orgId)
      .whereBetween('survey_responses.submitted_at', [startDate, endDate])
      .select(
        db.raw('COUNT(*) as total_responses'),
        db.raw('AVG(nps_score) as avg_nps_score')
      )
      .first();
    
    // Get abandoned process statistics
    const abandonedStats = await db('abandoned_processes')
      .join('users', 'abandoned_processes.user_id', '=', 'users.id')
      .where('users.org_id', orgId)
      .whereBetween('abandoned_processes.created_at', [startDate, endDate])
      .select(
        db.raw('COUNT(*) as total_abandoned'),
        db.raw('SUM(CASE WHEN status = "resolved" THEN 1 ELSE 0 END) as resolved_count'),
        db.raw('SUM(CASE WHEN resolution = "completed" THEN 1 ELSE 0 END) as completed_after_followup')
      )
      .first();
    
    return {
      time_period: {
        start_date: startDate,
        end_date: endDate
      },
      envelope_stats: envelopeStats,
      user_stats: userStats,
      onboarding_stats: onboardingStats,
      satisfaction_stats: satisfactionStats,
      abandoned_stats: abandonedStats
    };
  } catch (error) {
    console.error('Error getting customer success analytics:', error);
    throw new Error('Failed to get customer success analytics');
  }
};

module.exports = {
  // Onboarding workflows
  createOnboardingWorkflow,
  updateWorkflowStepStatus,
  getOnboardingWorkflow,
  getUserActiveWorkflow,
  scheduleOnboardingCommunication,
  
  // Tutorials
  createTutorial,
  getTutorial,
  listTutorials,
  trackTutorialCompletion,
  
  // Satisfaction surveys
  createSatisfactionSurvey,
  getSurvey,
  submitSurveyResponse,
  
  // Abandoned processes
  trackAbandonedProcess,
  scheduleAbandonedProcessFollowUp,
  sendAbandonedProcessFollowUp,
  resolveAbandonedProcess,
  
  // Analytics
  getCustomerSuccessAnalytics
};
