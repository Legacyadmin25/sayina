/**
 * Collaboration Controller
 * 
 * This controller handles document collaboration for the Sayina E-Signature platform,
 * allowing multiple users to work on documents together.
 */

const { ApiError } = require('../middleware/errorMiddleware');
const { 
  createCollaborationSession,
  addSessionParticipant,
  removeSessionParticipant,
  updateParticipantRole,
  getCollaborationSession,
  getUserCollaborationSessions,
  updateCollaborationSession,
  endCollaborationSession,
  recordCollaborationActivity,
  getSessionActivity,
  isSessionParticipant
} = require('../services/collaborationService');
const { logSystemEvent } = require('../services/loggerService');
const { db } = require('../config/db');

/**
 * @desc    Create a collaboration session
 * @route   POST /api/v1/collaboration/sessions
 * @access  Private
 */
const createSession = async (req, res, next) => {
  try {
    const { document_id, name, description, settings } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Validate required fields
    if (!document_id) {
      return next(new ApiError(400, 'Document ID is required'));
    }
    
    // Check if document exists and belongs to organization
    const document = await db('documents')
      .where('id', document_id)
      .where('org_id', orgId)
      .first();
    
    if (!document) {
      return next(new ApiError(404, 'Document not found or does not belong to your organization'));
    }
    
    // Create session
    const sessionId = await createCollaborationSession(document_id, userId, {
      name,
      description,
      settings
    });
    
    // Record activity
    await recordCollaborationActivity(sessionId, userId, 'session_created', {
      document_id,
      document_name: document.name
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'collaboration_session_created',
      metadata: {
        session_id: sessionId,
        document_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'Collaboration session created successfully',
      data: {
        session_id: sessionId
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get collaboration session details
 * @route   GET /api/v1/collaboration/sessions/:id
 * @access  Private
 */
const getSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Check if user is a participant
    const participantStatus = await isSessionParticipant(id, userId);
    
    if (!participantStatus.isParticipant) {
      // Check if session belongs to organization
      const session = await db('collaboration_sessions')
        .where('id', id)
        .where('org_id', orgId)
        .first();
      
      if (!session) {
        return next(new ApiError(403, 'You do not have permission to view this session'));
      }
    }
    
    // Get session details
    const session = await getCollaborationSession(id);
    
    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's collaboration sessions
 * @route   GET /api/v1/collaboration/sessions
 * @access  Private
 */
const getUserSessions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get sessions
    const sessions = await getUserCollaborationSessions(userId);
    
    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update collaboration session
 * @route   PUT /api/v1/collaboration/sessions/:id
 * @access  Private
 */
const updateSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, status, settings } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Check if user is a participant with owner role
    const participantStatus = await isSessionParticipant(id, userId);
    
    if (!participantStatus.isParticipant || participantStatus.role !== 'owner') {
      return next(new ApiError(403, 'You do not have permission to update this session'));
    }
    
    // Update session
    await updateCollaborationSession(id, {
      name,
      description,
      status,
      settings
    });
    
    // Record activity
    await recordCollaborationActivity(id, userId, 'session_updated', {
      name,
      description,
      status,
      settings
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'collaboration_session_updated',
      metadata: {
        session_id: id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Collaboration session updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    End collaboration session
 * @route   POST /api/v1/collaboration/sessions/:id/end
 * @access  Private
 */
const endSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Check if user is a participant with owner role
    const participantStatus = await isSessionParticipant(id, userId);
    
    if (!participantStatus.isParticipant || participantStatus.role !== 'owner') {
      return next(new ApiError(403, 'You do not have permission to end this session'));
    }
    
    // End session
    await endCollaborationSession(id);
    
    // Record activity
    await recordCollaborationActivity(id, userId, 'session_ended');
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'collaboration_session_ended',
      metadata: {
        session_id: id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Collaboration session ended successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add participant to session
 * @route   POST /api/v1/collaboration/sessions/:id/participants
 * @access  Private
 */
const addParticipant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user_id, role } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    
    // Validate required fields
    if (!user_id) {
      return next(new ApiError(400, 'User ID is required'));
    }
    
    // Check if user is a participant with owner role
    const participantStatus = await isSessionParticipant(id, userId);
    
    if (!participantStatus.isParticipant || participantStatus.role !== 'owner') {
      return next(new ApiError(403, 'You do not have permission to add participants to this session'));
    }
    
    // Check if user to add belongs to organization
    const userToAdd = await db('users')
      .where('id', user_id)
      .where('org_id', orgId)
      .first();
    
    if (!userToAdd) {
      return next(new ApiError(404, 'User not found or does not belong to your organization'));
    }
    
    // Add participant
    const participantId = await addSessionParticipant(id, user_id, role || 'collaborator');
    
    // Record activity
    await recordCollaborationActivity(id, userId, 'participant_added', {
      added_user_id: user_id,
      added_user_name: `${userToAdd.first_name} ${userToAdd.last_name}`,
      role: role || 'collaborator'
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'collaboration_participant_added',
      metadata: {
        session_id: id,
        participant_id: participantId,
        participant_user_id: user_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Participant added to session successfully',
      data: {
        participant_id: participantId
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove participant from session
 * @route   DELETE /api/v1/collaboration/sessions/:id/participants/:userId
 * @access  Private
 */
const removeParticipant = async (req, res, next) => {
  try {
    const { id, userId: participantUserId } = req.params;
    const userId = req.user.id;
    
    // Check if user is a participant with owner role or is removing themselves
    const participantStatus = await isSessionParticipant(id, userId);
    
    if (!participantStatus.isParticipant) {
      return next(new ApiError(403, 'You do not have permission to access this session'));
    }
    
    if (participantStatus.role !== 'owner' && userId !== participantUserId) {
      return next(new ApiError(403, 'You do not have permission to remove other participants'));
    }
    
    // Get participant to remove
    const participantToRemove = await db('users')
      .where('id', participantUserId)
      .select('first_name', 'last_name')
      .first();
    
    if (!participantToRemove) {
      return next(new ApiError(404, 'User not found'));
    }
    
    // Remove participant
    await removeSessionParticipant(id, participantUserId);
    
    // Record activity
    await recordCollaborationActivity(id, userId, 'participant_removed', {
      removed_user_id: participantUserId,
      removed_user_name: `${participantToRemove.first_name} ${participantToRemove.last_name}`
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'collaboration_participant_removed',
      metadata: {
        session_id: id,
        participant_user_id: participantUserId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Participant removed from session successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update participant role
 * @route   PUT /api/v1/collaboration/sessions/:id/participants/:userId
 * @access  Private
 */
const updateParticipant = async (req, res, next) => {
  try {
    const { id, userId: participantUserId } = req.params;
    const { role } = req.body;
    const userId = req.user.id;
    
    // Validate required fields
    if (!role) {
      return next(new ApiError(400, 'Role is required'));
    }
    
    // Check if user is a participant with owner role
    const participantStatus = await isSessionParticipant(id, userId);
    
    if (!participantStatus.isParticipant || participantStatus.role !== 'owner') {
      return next(new ApiError(403, 'You do not have permission to update participant roles'));
    }
    
    // Get participant to update
    const participantToUpdate = await db('users')
      .where('id', participantUserId)
      .select('first_name', 'last_name')
      .first();
    
    if (!participantToUpdate) {
      return next(new ApiError(404, 'User not found'));
    }
    
    // Update participant role
    await updateParticipantRole(id, participantUserId, role);
    
    // Record activity
    await recordCollaborationActivity(id, userId, 'participant_role_updated', {
      updated_user_id: participantUserId,
      updated_user_name: `${participantToUpdate.first_name} ${participantToUpdate.last_name}`,
      role
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'collaboration_participant_role_updated',
      metadata: {
        session_id: id,
        participant_user_id: participantUserId,
        role
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Participant role updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get session activity
 * @route   GET /api/v1/collaboration/sessions/:id/activity
 * @access  Private
 */
const getActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0, start_date, end_date } = req.query;
    const userId = req.user.id;
    
    // Check if user is a participant
    const participantStatus = await isSessionParticipant(id, userId);
    
    if (!participantStatus.isParticipant) {
      return next(new ApiError(403, 'You do not have permission to view this session'));
    }
    
    // Get activity
    const activity = await getSessionActivity(id, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      startDate: start_date,
      endDate: end_date
    });
    
    res.status(200).json({
      success: true,
      count: activity.length,
      data: activity
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Record activity
 * @route   POST /api/v1/collaboration/sessions/:id/activity
 * @access  Private
 */
const recordActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, details } = req.body;
    const userId = req.user.id;
    
    // Validate required fields
    if (!action) {
      return next(new ApiError(400, 'Action is required'));
    }
    
    // Check if user is a participant
    const participantStatus = await isSessionParticipant(id, userId);
    
    if (!participantStatus.isParticipant) {
      return next(new ApiError(403, 'You do not have permission to record activity in this session'));
    }
    
    // Record activity
    const activityId = await recordCollaborationActivity(id, userId, action, details);
    
    res.status(200).json({
      success: true,
      message: 'Activity recorded successfully',
      data: {
        activity_id: activityId
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSession,
  getSession,
  getUserSessions,
  updateSession,
  endSession,
  addParticipant,
  removeParticipant,
  updateParticipant,
  getActivity,
  recordActivity
};
