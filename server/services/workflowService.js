/**
 * Workflow Service
 * 
 * This service provides functionality for document workflow automation in the Sayina E-Signature platform,
 * allowing for approval processes, sequential signing, and conditional routing.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { logSystemEvent } = require('./loggerService');

/**
 * Create a workflow template
 * @param {string} orgId - Organization ID
 * @param {string} createdBy - User ID of creator
 * @param {Object} templateData - Template data
 * @returns {Promise<string>} - Template ID
 */
const createWorkflowTemplate = async (orgId, createdBy, templateData) => {
  try {
    const {
      name,
      description,
      steps,
      settings = {}
    } = templateData;
    
    // Validate steps
    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      throw new Error('Workflow template must have at least one step');
    }
    
    // Create template
    const templateId = uuidv4();
    await db('workflow_templates').insert({
      id: templateId,
      org_id: orgId,
      created_by: createdBy,
      name,
      description: description || null,
      steps: JSON.stringify(steps),
      settings: JSON.stringify(settings),
      created_at: db.fn.now()
    });
    
    return templateId;
  } catch (error) {
    console.error('Error creating workflow template:', error);
    throw error;
  }
};

/**
 * Update workflow template
 * @param {string} templateId - Template ID
 * @param {Object} templateData - Updated template data
 * @returns {Promise<boolean>} - Success status
 */
const updateWorkflowTemplate = async (templateId, templateData) => {
  try {
    const {
      name,
      description,
      steps,
      settings,
      is_active
    } = templateData;
    
    // Build update object
    const updateObj = {};
    
    if (name !== undefined) updateObj.name = name;
    if (description !== undefined) updateObj.description = description;
    if (steps !== undefined) updateObj.steps = JSON.stringify(steps);
    if (settings !== undefined) updateObj.settings = JSON.stringify(settings);
    if (is_active !== undefined) updateObj.is_active = is_active;
    
    updateObj.updated_at = db.fn.now();
    
    // Update template
    await db('workflow_templates')
      .where('id', templateId)
      .update(updateObj);
    
    return true;
  } catch (error) {
    console.error('Error updating workflow template:', error);
    throw error;
  }
};

/**
 * Delete workflow template
 * @param {string} templateId - Template ID
 * @returns {Promise<boolean>} - Success status
 */
const deleteWorkflowTemplate = async (templateId) => {
  try {
    // Check if template is in use
    const activeWorkflows = await db('workflows')
      .where('template_id', templateId)
      .whereIn('status', ['active', 'pending'])
      .count('id as count')
      .first();
    
    if (activeWorkflows.count > 0) {
      throw new Error('Cannot delete template that is in use by active workflows');
    }
    
    // Delete template
    await db('workflow_templates')
      .where('id', templateId)
      .delete();
    
    return true;
  } catch (error) {
    console.error('Error deleting workflow template:', error);
    throw error;
  }
};

/**
 * Get workflow template
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} - Template details
 */
const getWorkflowTemplate = async (templateId) => {
  try {
    // Get template
    const template = await db('workflow_templates')
      .where('id', templateId)
      .first();
    
    if (!template) {
      throw new Error('Workflow template not found');
    }
    
    // Get creator
    const creator = await db('users')
      .where('id', template.created_by)
      .select('id', 'first_name', 'last_name', 'email')
      .first();
    
    return {
      id: template.id,
      org_id: template.org_id,
      name: template.name,
      description: template.description,
      steps: JSON.parse(template.steps),
      settings: JSON.parse(template.settings),
      is_active: template.is_active,
      created_by: creator,
      created_at: template.created_at,
      updated_at: template.updated_at
    };
  } catch (error) {
    console.error('Error getting workflow template:', error);
    throw error;
  }
};

/**
 * Get organization workflow templates
 * @param {string} orgId - Organization ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Workflow templates
 */
const getOrganizationWorkflowTemplates = async (orgId, options = {}) => {
  try {
    const {
      isActive,
      search,
      limit = 20,
      offset = 0
    } = options;
    
    // Build query
    let query = db('workflow_templates')
      .where('org_id', orgId);
    
    // Apply filters
    if (isActive !== undefined) {
      query = query.where('is_active', isActive);
    }
    
    if (search) {
      query = query.where(function() {
        this.where('name', 'ilike', `%${search}%`)
            .orWhere('description', 'ilike', `%${search}%`);
      });
    }
    
    // Apply pagination
    query = query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    // Get templates
    const templates = await query;
    
    // Get creator IDs
    const creatorIds = [...new Set(templates.map(t => t.created_by))];
    
    // Get creators
    const creators = await db('users')
      .whereIn('id', creatorIds)
      .select('id', 'first_name', 'last_name');
    
    // Create creator lookup
    const creatorLookup = {};
    creators.forEach(creator => {
      creatorLookup[creator.id] = creator;
    });
    
    // Format templates
    return templates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      step_count: JSON.parse(template.steps).length,
      is_active: template.is_active,
      created_by: creatorLookup[template.created_by] || { id: template.created_by },
      created_at: template.created_at
    }));
  } catch (error) {
    console.error('Error getting organization workflow templates:', error);
    throw error;
  }
};

/**
 * Create a workflow instance
 * @param {string} templateId - Template ID
 * @param {string} envelopeId - Envelope ID
 * @param {string} createdBy - User ID of creator
 * @param {Object} options - Workflow options
 * @returns {Promise<string>} - Workflow ID
 */
const createWorkflow = async (templateId, envelopeId, createdBy, options = {}) => {
  try {
    // Get template
    const template = await getWorkflowTemplate(templateId);
    
    // Get envelope
    const envelope = await db('envelopes')
      .where('id', envelopeId)
      .first();
    
    if (!envelope) {
      throw new Error('Envelope not found');
    }
    
    // Check if envelope already has a workflow
    const existingWorkflow = await db('workflows')
      .where('envelope_id', envelopeId)
      .whereIn('status', ['active', 'pending'])
      .first();
    
    if (existingWorkflow) {
      throw new Error('Envelope already has an active workflow');
    }
    
    // Initialize workflow data
    const workflowSteps = template.steps.map((step, index) => ({
      ...step,
      step_number: index + 1,
      status: index === 0 ? 'pending' : 'not_started',
      started_at: null,
      completed_at: null
    }));
    
    // Create workflow
    const workflowId = uuidv4();
    await db('workflows').insert({
      id: workflowId,
      template_id: templateId,
      envelope_id: envelopeId,
      org_id: template.org_id,
      created_by: createdBy,
      current_step: 1,
      steps: JSON.stringify(workflowSteps),
      status: 'pending',
      settings: JSON.stringify(options.settings || template.settings),
      created_at: db.fn.now()
    });
    
    return workflowId;
  } catch (error) {
    console.error('Error creating workflow:', error);
    throw error;
  }
};

/**
 * Get workflow details
 * @param {string} workflowId - Workflow ID
 * @returns {Promise<Object>} - Workflow details
 */
const getWorkflow = async (workflowId) => {
  try {
    // Get workflow
    const workflow = await db('workflows')
      .where('id', workflowId)
      .first();
    
    if (!workflow) {
      throw new Error('Workflow not found');
    }
    
    // Get envelope
    const envelope = await db('envelopes')
      .where('id', workflow.envelope_id)
      .select('id', 'name', 'status')
      .first();
    
    // Get template
    const template = await db('workflow_templates')
      .where('id', workflow.template_id)
      .select('id', 'name')
      .first();
    
    // Get creator
    const creator = await db('users')
      .where('id', workflow.created_by)
      .select('id', 'first_name', 'last_name', 'email')
      .first();
    
    return {
      id: workflow.id,
      template: template,
      envelope: envelope,
      org_id: workflow.org_id,
      current_step: workflow.current_step,
      steps: JSON.parse(workflow.steps),
      status: workflow.status,
      settings: JSON.parse(workflow.settings),
      created_by: creator,
      created_at: workflow.created_at,
      started_at: workflow.started_at,
      completed_at: workflow.completed_at
    };
  } catch (error) {
    console.error('Error getting workflow:', error);
    throw error;
  }
};

/**
 * Get envelope workflow
 * @param {string} envelopeId - Envelope ID
 * @returns {Promise<Object>} - Workflow details
 */
const getEnvelopeWorkflow = async (envelopeId) => {
  try {
    // Get workflow
    const workflow = await db('workflows')
      .where('envelope_id', envelopeId)
      .orderBy('created_at', 'desc')
      .first();
    
    if (!workflow) {
      return null;
    }
    
    return getWorkflow(workflow.id);
  } catch (error) {
    console.error('Error getting envelope workflow:', error);
    throw error;
  }
};

/**
 * Start workflow
 * @param {string} workflowId - Workflow ID
 * @returns {Promise<Object>} - Updated workflow
 */
const startWorkflow = async (workflowId) => {
  try {
    // Get workflow
    const workflow = await getWorkflow(workflowId);
    
    if (workflow.status !== 'pending') {
      throw new Error(`Cannot start workflow with status ${workflow.status}`);
    }
    
    // Update workflow status
    await db('workflows')
      .where('id', workflowId)
      .update({
        status: 'active',
        started_at: db.fn.now()
      });
    
    // Update first step status
    const steps = workflow.steps;
    steps[0].status = 'active';
    steps[0].started_at = new Date();
    
    await db('workflows')
      .where('id', workflowId)
      .update({
        steps: JSON.stringify(steps)
      });
    
    // Create task for first step
    await createWorkflowTask(workflowId, 1);
    
    return {
      ...workflow,
      status: 'active',
      started_at: new Date(),
      steps
    };
  } catch (error) {
    console.error('Error starting workflow:', error);
    throw error;
  }
};

/**
 * Complete workflow step
 * @param {string} workflowId - Workflow ID
 * @param {number} stepNumber - Step number
 * @param {Object} completionData - Completion data
 * @returns {Promise<Object>} - Updated workflow
 */
const completeWorkflowStep = async (workflowId, stepNumber, completionData = {}) => {
  try {
    // Get workflow
    const workflow = await getWorkflow(workflowId);
    
    if (workflow.status !== 'active') {
      throw new Error(`Cannot complete step in workflow with status ${workflow.status}`);
    }
    
    if (workflow.current_step !== stepNumber) {
      throw new Error(`Cannot complete step ${stepNumber}, current step is ${workflow.current_step}`);
    }
    
    // Update step status
    const steps = workflow.steps;
    const stepIndex = stepNumber - 1;
    
    if (stepIndex < 0 || stepIndex >= steps.length) {
      throw new Error(`Invalid step number: ${stepNumber}`);
    }
    
    if (steps[stepIndex].status !== 'active') {
      throw new Error(`Cannot complete step with status ${steps[stepIndex].status}`);
    }
    
    steps[stepIndex].status = 'completed';
    steps[stepIndex].completed_at = new Date();
    steps[stepIndex].completion_data = completionData;
    
    // Check if there are more steps
    const nextStepIndex = stepIndex + 1;
    let workflowStatus = 'active';
    let workflowCompleted = null;
    let currentStep = stepNumber;
    
    if (nextStepIndex < steps.length) {
      // Move to next step
      steps[nextStepIndex].status = 'active';
      steps[nextStepIndex].started_at = new Date();
      currentStep = nextStepIndex + 1;
      
      // Create task for next step
      await createWorkflowTask(workflowId, currentStep);
    } else {
      // Workflow completed
      workflowStatus = 'completed';
      workflowCompleted = new Date();
    }
    
    // Update workflow
    await db('workflows')
      .where('id', workflowId)
      .update({
        current_step: currentStep,
        steps: JSON.stringify(steps),
        status: workflowStatus,
        completed_at: workflowCompleted,
        updated_at: db.fn.now()
      });
    
    // Close current step task
    await completeWorkflowTask(workflowId, stepNumber);
    
    return {
      ...workflow,
      current_step: currentStep,
      steps,
      status: workflowStatus,
      completed_at: workflowCompleted
    };
  } catch (error) {
    console.error('Error completing workflow step:', error);
    throw error;
  }
};

/**
 * Create workflow task
 * @param {string} workflowId - Workflow ID
 * @param {number} stepNumber - Step number
 * @returns {Promise<string>} - Task ID
 */
const createWorkflowTask = async (workflowId, stepNumber) => {
  try {
    // Get workflow
    const workflow = await getWorkflow(workflowId);
    
    const stepIndex = stepNumber - 1;
    if (stepIndex < 0 || stepIndex >= workflow.steps.length) {
      throw new Error(`Invalid step number: ${stepNumber}`);
    }
    
    const step = workflow.steps[stepIndex];
    
    // Create task
    const taskId = uuidv4();
    await db('workflow_tasks').insert({
      id: taskId,
      workflow_id: workflowId,
      step_number: stepNumber,
      org_id: workflow.org_id,
      envelope_id: workflow.envelope.id,
      assigned_to: step.assigned_to || null,
      assigned_role: step.assigned_role || null,
      task_type: step.type,
      task_data: JSON.stringify(step.data || {}),
      status: 'pending',
      created_at: db.fn.now()
    });
    
    return taskId;
  } catch (error) {
    console.error('Error creating workflow task:', error);
    throw error;
  }
};

/**
 * Complete workflow task
 * @param {string} workflowId - Workflow ID
 * @param {number} stepNumber - Step number
 * @returns {Promise<boolean>} - Success status
 */
const completeWorkflowTask = async (workflowId, stepNumber) => {
  try {
    // Update task status
    await db('workflow_tasks')
      .where('workflow_id', workflowId)
      .where('step_number', stepNumber)
      .update({
        status: 'completed',
        completed_at: db.fn.now()
      });
    
    return true;
  } catch (error) {
    console.error('Error completing workflow task:', error);
    throw error;
  }
};

/**
 * Get user's workflow tasks
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Workflow tasks
 */
const getUserWorkflowTasks = async (userId, options = {}) => {
  try {
    const {
      status,
      limit = 20,
      offset = 0
    } = options;
    
    // Get user
    const user = await db('users')
      .where('id', userId)
      .first();
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Build query
    let query = db('workflow_tasks')
      .where(function() {
        this.where('assigned_to', userId)
            .orWhere('assigned_role', user.role);
      });
    
    // Apply filters
    if (status) {
      query = query.where('status', status);
    }
    
    // Apply pagination
    query = query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    // Get tasks
    const tasks = await query;
    
    // Get workflow IDs
    const workflowIds = [...new Set(tasks.map(t => t.workflow_id))];
    
    // Get workflows
    const workflows = await db('workflows')
      .whereIn('id', workflowIds)
      .select('id', 'template_id', 'envelope_id');
    
    // Create workflow lookup
    const workflowLookup = {};
    workflows.forEach(workflow => {
      workflowLookup[workflow.id] = workflow;
    });
    
    // Get envelope IDs
    const envelopeIds = [...new Set(workflows.map(w => w.envelope_id))];
    
    // Get envelopes
    const envelopes = await db('envelopes')
      .whereIn('id', envelopeIds)
      .select('id', 'name');
    
    // Create envelope lookup
    const envelopeLookup = {};
    envelopes.forEach(envelope => {
      envelopeLookup[envelope.id] = envelope;
    });
    
    // Get template IDs
    const templateIds = [...new Set(workflows.map(w => w.template_id))];
    
    // Get templates
    const templates = await db('workflow_templates')
      .whereIn('id', templateIds)
      .select('id', 'name');
    
    // Create template lookup
    const templateLookup = {};
    templates.forEach(template => {
      templateLookup[template.id] = template;
    });
    
    // Format tasks
    return tasks.map(task => {
      const workflow = workflowLookup[task.workflow_id] || {};
      const envelope = envelopeLookup[workflow.envelope_id] || {};
      const template = templateLookup[workflow.template_id] || {};
      
      return {
        id: task.id,
        workflow_id: task.workflow_id,
        step_number: task.step_number,
        envelope: {
          id: envelope.id,
          name: envelope.name
        },
        template: {
          id: template.id,
          name: template.name
        },
        task_type: task.task_type,
        task_data: JSON.parse(task.task_data),
        status: task.status,
        created_at: task.created_at,
        completed_at: task.completed_at
      };
    });
  } catch (error) {
    console.error('Error getting user workflow tasks:', error);
    throw error;
  }
};

/**
 * Cancel workflow
 * @param {string} workflowId - Workflow ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<boolean>} - Success status
 */
const cancelWorkflow = async (workflowId, reason) => {
  try {
    // Get workflow
    const workflow = await getWorkflow(workflowId);
    
    if (!['pending', 'active'].includes(workflow.status)) {
      throw new Error(`Cannot cancel workflow with status ${workflow.status}`);
    }
    
    // Update workflow status
    await db('workflows')
      .where('id', workflowId)
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        updated_at: db.fn.now()
      });
    
    // Cancel active tasks
    await db('workflow_tasks')
      .where('workflow_id', workflowId)
      .where('status', 'pending')
      .update({
        status: 'cancelled',
        updated_at: db.fn.now()
      });
    
    return true;
  } catch (error) {
    console.error('Error cancelling workflow:', error);
    throw error;
  }
};

module.exports = {
  createWorkflowTemplate,
  updateWorkflowTemplate,
  deleteWorkflowTemplate,
  getWorkflowTemplate,
  getOrganizationWorkflowTemplates,
  createWorkflow,
  getWorkflow,
  getEnvelopeWorkflow,
  startWorkflow,
  completeWorkflowStep,
  getUserWorkflowTasks,
  cancelWorkflow
};
