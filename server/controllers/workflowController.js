/**
 * Workflow Controller
 * 
 * This controller handles document workflow automation for the Sayina E-Signature platform,
 * allowing for approval processes, sequential signing, and conditional routing.
 */

const { ApiError } = require('../middleware/errorMiddleware');
const { 
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
} = require('../services/workflowService');
const { logSystemEvent } = require('../services/loggerService');
const db = require('../config/db');

/**
 * @desc    Create a workflow template
 * @route   POST /api/v1/workflows/templates
 * @access  Private
 */
const createTemplate = async (req, res, next) => {
  try {
    const { name, description, steps, settings } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Validate required fields
    if (!name || !steps) {
      return next(new ApiError(400, 'Name and steps are required'));
    }
    
    // Create template
    const templateId = await createWorkflowTemplate(orgId, userId, {
      name,
      description,
      steps,
      settings
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'workflow_template_created',
      metadata: {
        template_id: templateId,
        template_name: name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'Workflow template created successfully',
      data: {
        template_id: templateId
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update workflow template
 * @route   PUT /api/v1/workflows/templates/:id
 * @access  Private
 */
const updateTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, steps, settings, is_active } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Check if template exists and belongs to organization
    const template = await getWorkflowTemplate(id);
    
    if (template.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to update this template'));
    }
    
    // Update template
    await updateWorkflowTemplate(id, {
      name,
      description,
      steps,
      settings,
      is_active
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'workflow_template_updated',
      metadata: {
        template_id: id,
        template_name: name || template.name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Workflow template updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete workflow template
 * @route   DELETE /api/v1/workflows/templates/:id
 * @access  Private
 */
const deleteTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Check if template exists and belongs to organization
    const template = await getWorkflowTemplate(id);
    
    if (template.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to delete this template'));
    }
    
    // Delete template
    await deleteWorkflowTemplate(id);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'workflow_template_deleted',
      metadata: {
        template_id: id,
        template_name: template.name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Workflow template deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get workflow template
 * @route   GET /api/v1/workflows/templates/:id
 * @access  Private
 */
const getTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;
    
    // Get template
    const template = await getWorkflowTemplate(id);
    
    // Check if template belongs to organization
    if (template.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to view this template'));
    }
    
    res.status(200).json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get organization workflow templates
 * @route   GET /api/v1/workflows/templates
 * @access  Private
 */
const getTemplates = async (req, res, next) => {
  try {
    const { is_active, search, limit = 20, offset = 0 } = req.query;
    const orgId = req.user.org_id;
    
    // Get templates
    const templates = await getOrganizationWorkflowTemplates(orgId, {
      isActive: is_active === 'true',
      search,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.status(200).json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a workflow
 * @route   POST /api/v1/workflows
 * @access  Private
 */
const createWorkflowInstance = async (req, res, next) => {
  try {
    const { template_id, envelope_id, settings } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Validate required fields
    if (!template_id || !envelope_id) {
      return next(new ApiError(400, 'Template ID and envelope ID are required'));
    }
    
    // Check if template exists and belongs to organization
    const template = await getWorkflowTemplate(template_id);
    
    if (template.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to use this template'));
    }
    
    // Check if envelope exists and belongs to organization
    const envelope = await db('envelopes')
      .where('id', envelope_id)
      .where('org_id', orgId)
      .first();
    
    if (!envelope) {
      return next(new ApiError(404, 'Envelope not found or does not belong to your organization'));
    }
    
    // Create workflow
    const workflowId = await createWorkflow(template_id, envelope_id, userId, {
      settings
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'workflow_created',
      metadata: {
        workflow_id: workflowId,
        template_id,
        envelope_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'Workflow created successfully',
      data: {
        workflow_id: workflowId
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get workflow details
 * @route   GET /api/v1/workflows/:id
 * @access  Private
 */
const getWorkflowDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;
    
    // Get workflow
    const workflow = await getWorkflow(id);
    
    // Check if workflow belongs to organization
    if (workflow.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to view this workflow'));
    }
    
    res.status(200).json({
      success: true,
      data: workflow
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get envelope workflow
 * @route   GET /api/v1/workflows/envelope/:envelopeId
 * @access  Private
 */
const getEnvelopeWorkflowDetails = async (req, res, next) => {
  try {
    const { envelopeId } = req.params;
    const orgId = req.user.org_id;
    
    // Check if envelope exists and belongs to organization
    const envelope = await db('envelopes')
      .where('id', envelopeId)
      .where('org_id', orgId)
      .first();
    
    if (!envelope) {
      return next(new ApiError(404, 'Envelope not found or does not belong to your organization'));
    }
    
    // Get workflow
    const workflow = await getEnvelopeWorkflow(envelopeId);
    
    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'No workflow found for this envelope'
      });
    }
    
    res.status(200).json({
      success: true,
      data: workflow
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Start workflow
 * @route   POST /api/v1/workflows/:id/start
 * @access  Private
 */
const startWorkflowInstance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Get workflow
    const workflow = await getWorkflow(id);
    
    // Check if workflow belongs to organization
    if (workflow.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to start this workflow'));
    }
    
    // Start workflow
    const updatedWorkflow = await startWorkflow(id);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'workflow_started',
      metadata: {
        workflow_id: id,
        envelope_id: workflow.envelope.id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Workflow started successfully',
      data: {
        current_step: updatedWorkflow.current_step,
        status: updatedWorkflow.status
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Complete workflow step
 * @route   POST /api/v1/workflows/:id/steps/:stepNumber/complete
 * @access  Private
 */
const completeStep = async (req, res, next) => {
  try {
    const { id, stepNumber } = req.params;
    const { completion_data } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Get workflow
    const workflow = await getWorkflow(id);
    
    // Check if workflow belongs to organization
    if (workflow.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to update this workflow'));
    }
    
    // Complete step
    const updatedWorkflow = await completeWorkflowStep(id, parseInt(stepNumber), completion_data);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'workflow_step_completed',
      metadata: {
        workflow_id: id,
        step_number: stepNumber,
        envelope_id: workflow.envelope.id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Workflow step completed successfully',
      data: {
        current_step: updatedWorkflow.current_step,
        status: updatedWorkflow.status,
        completed: updatedWorkflow.status === 'completed'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's workflow tasks
 * @route   GET /api/v1/workflows/tasks
 * @access  Private
 */
const getUserTasks = async (req, res, next) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;
    const userId = req.user.id;
    
    // Get tasks
    const tasks = await getUserWorkflowTasks(userId, {
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel workflow
 * @route   POST /api/v1/workflows/:id/cancel
 * @access  Private
 */
const cancelWorkflowInstance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Validate required fields
    if (!reason) {
      return next(new ApiError(400, 'Cancellation reason is required'));
    }
    
    // Get workflow
    const workflow = await getWorkflow(id);
    
    // Check if workflow belongs to organization
    if (workflow.org_id !== orgId) {
      return next(new ApiError(403, 'You do not have permission to cancel this workflow'));
    }
    
    // Cancel workflow
    await cancelWorkflow(id, reason);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'workflow_cancelled',
      metadata: {
        workflow_id: id,
        envelope_id: workflow.envelope.id,
        reason
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Workflow cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplate,
  getTemplates,
  createWorkflowInstance,
  getWorkflowDetails,
  getEnvelopeWorkflowDetails,
  startWorkflowInstance,
  completeStep,
  getUserTasks,
  cancelWorkflowInstance
};
