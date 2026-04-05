/**
 * Collaboration Service
 * 
 * This service provides functionality for document collaboration in the Sayina E-Signature platform,
 * allowing multiple users to work on documents together.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { logSystemEvent } = require('./loggerService');

/**
 * Create a collaboration session
 * @param {string} documentId - Document ID
 * @param {string} createdBy - User ID of creator
 * @param {Object} options - Collaboration options
 * @returns {Promise<string>} - Session ID
 */
const createCollaborationSession = async (documentId, createdBy, options = {}) => {
  try {
    // Get document details
    const document = await db('documents')
      .where('id', documentId)
      .first();
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Create session
    const sessionId = uuidv4();
    await db('collaboration_sessions').insert({
      id: sessionId,
      document_id: documentId,
      org_id: document.org_id,
      created_by: createdBy,
      name: options.name || `Collaboration on ${document.name}`,
      description: options.description || null,
      status: 'active',
      settings: JSON.stringify(options.settings || {}),
      created_at: db.fn.now()
    });
    
    // Add creator as participant
    await addSessionParticipant(sessionId, createdBy, 'owner');
    
    return sessionId;
  } catch (error) {
    console.error('Error creating collaboration session:', error);
    throw error;
  }
};

/**
 * Add participant to collaboration session
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID
 * @param {string} role - Participant role
 * @returns {Promise<string>} - Participant ID
 */
const addSessionParticipant = async (sessionId, userId, role = 'collaborator') => {
  try {
    // Check if session exists
    const session = await db('collaboration_sessions')
      .where('id', sessionId)
      .first();
    
    if (!session) {
      throw new Error('Collaboration session not found');
    }
    
    // Check if user exists
    const user = await db('users')
      .where('id', userId)
      .first();
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if user already a participant
    const existingParticipant = await db('collaboration_participants')
      .where('session_id', sessionId)
      .where('user_id', userId)
      .first();
    
    if (existingParticipant) {
      // Update role if different
      if (existingParticipant.role !== role) {
        await db('collaboration_participants')
          .where('id', existingParticipant.id)
          .update({
            role,
            updated_at: db.fn.now()
          });
      }
      
      return existingParticipant.id;
    }
    
    // Add participant
    const participantId = uuidv4();
    await db('collaboration_participants').insert({
      id: participantId,
      session_id: sessionId,
      user_id: userId,
      role,
      status: 'active',
      joined_at: db.fn.now()
    });
    
    return participantId;
  } catch (error) {
    console.error('Error adding session participant:', error);
    throw error;
  }
};

/**
 * Remove participant from collaboration session
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - Success status
 */
const removeSessionParticipant = async (sessionId, userId) => {
  try {
    // Check if participant exists
    const participant = await db('collaboration_participants')
      .where('session_id', sessionId)
      .where('user_id', userId)
      .first();
    
    if (!participant) {
      throw new Error('Participant not found in session');
    }
    
    // Check if participant is the owner
    if (participant.role === 'owner') {
      // Count other participants
      const otherParticipants = await db('collaboration_participants')
        .where('session_id', sessionId)
        .whereNot('user_id', userId)
        .count('id as count')
        .first();
      
      if (otherParticipants.count > 0) {
        throw new Error('Cannot remove the owner while other participants exist');
      }
    }
    
    // Remove participant
    await db('collaboration_participants')
      .where('session_id', sessionId)
      .where('user_id', userId)
      .delete();
    
    return true;
  } catch (error) {
    console.error('Error removing session participant:', error);
    throw error;
  }
};

/**
 * Update participant role
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID
 * @param {string} role - New role
 * @returns {Promise<boolean>} - Success status
 */
const updateParticipantRole = async (sessionId, userId, role) => {
  try {
    // Check if participant exists
    const participant = await db('collaboration_participants')
      .where('session_id', sessionId)
      .where('user_id', userId)
      .first();
    
    if (!participant) {
      throw new Error('Participant not found in session');
    }
    
    // Check if trying to change owner
    if (participant.role === 'owner' && role !== 'owner') {
      throw new Error('Cannot change the role of the session owner');
    }
    
    // Update role
    await db('collaboration_participants')
      .where('session_id', sessionId)
      .where('user_id', userId)
      .update({
        role,
        updated_at: db.fn.now()
      });
    
    return true;
  } catch (error) {
    console.error('Error updating participant role:', error);
    throw error;
  }
};

/**
 * Get collaboration session details
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} - Session details
 */
const getCollaborationSession = async (sessionId) => {
  try {
    // Get session
    const session = await db('collaboration_sessions')
      .where('id', sessionId)
      .first();
    
    if (!session) {
      throw new Error('Collaboration session not found');
    }
    
    // Get document
    const document = await db('documents')
      .where('id', session.document_id)
      .select('id', 'name', 'file_name', 'file_type')
      .first();
    
    // Get participants
    const participants = await db('collaboration_participants')
      .where('session_id', sessionId)
      .orderBy('joined_at');
    
    // Get user details
    const userIds = participants.map(p => p.user_id);
    const users = await db('users')
      .whereIn('id', userIds)
      .select('id', 'first_name', 'last_name', 'email', 'profile_image');
    
    // Create user lookup
    const userLookup = {};
    users.forEach(user => {
      userLookup[user.id] = user;
    });
    
    // Format participants
    const formattedParticipants = participants.map(p => ({
      id: p.id,
      user: userLookup[p.user_id],
      role: p.role,
      status: p.status,
      joined_at: p.joined_at
    }));
    
    // Get activity
    const activity = await db('collaboration_activity')
      .where('session_id', sessionId)
      .orderBy('created_at', 'desc')
      .limit(20);
    
    // Format activity
    const formattedActivity = activity.map(a => ({
      id: a.id,
      user_id: a.user_id,
      user: userLookup[a.user_id] || { id: a.user_id },
      action: a.action,
      details: a.details ? JSON.parse(a.details) : null,
      created_at: a.created_at
    }));
    
    return {
      id: session.id,
      name: session.name,
      description: session.description,
      document,
      status: session.status,
      settings: JSON.parse(session.settings),
      participants: formattedParticipants,
      activity: formattedActivity,
      created_at: session.created_at,
      updated_at: session.updated_at
    };
  } catch (error) {
    console.error('Error getting collaboration session:', error);
    throw error;
  }
};

/**
 * Get user's collaboration sessions
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Collaboration sessions
 */
const getUserCollaborationSessions = async (userId) => {
  try {
    // Get sessions where user is a participant
    const participations = await db('collaboration_participants')
      .where('user_id', userId)
      .select('session_id', 'role');
    
    if (participations.length === 0) {
      return [];
    }
    
    // Get session IDs
    const sessionIds = participations.map(p => p.session_id);
    
    // Get sessions
    const sessions = await db('collaboration_sessions')
      .whereIn('id', sessionIds)
      .where('status', 'active')
      .orderBy('updated_at', 'desc');
    
    // Get document IDs
    const documentIds = sessions.map(s => s.document_id);
    
    // Get documents
    const documents = await db('documents')
      .whereIn('id', documentIds)
      .select('id', 'name', 'file_name', 'file_type');
    
    // Create document lookup
    const documentLookup = {};
    documents.forEach(doc => {
      documentLookup[doc.id] = doc;
    });
    
    // Create role lookup
    const roleLookup = {};
    participations.forEach(p => {
      roleLookup[p.session_id] = p.role;
    });
    
    // Format sessions
    return sessions.map(session => ({
      id: session.id,
      name: session.name,
      description: session.description,
      document: documentLookup[session.document_id],
      status: session.status,
      role: roleLookup[session.id],
      created_at: session.created_at,
      updated_at: session.updated_at
    }));
  } catch (error) {
    console.error('Error getting user collaboration sessions:', error);
    throw error;
  }
};

/**
 * Update collaboration session
 * @param {string} sessionId - Session ID
 * @param {Object} updateData - Update data
 * @returns {Promise<boolean>} - Success status
 */
const updateCollaborationSession = async (sessionId, updateData) => {
  try {
    const {
      name,
      description,
      status,
      settings
    } = updateData;
    
    // Build update object
    const updateObj = {};
    
    if (name !== undefined) updateObj.name = name;
    if (description !== undefined) updateObj.description = description;
    if (status !== undefined) updateObj.status = status;
    if (settings !== undefined) updateObj.settings = JSON.stringify(settings);
    
    updateObj.updated_at = db.fn.now();
    
    // Update session
    await db('collaboration_sessions')
      .where('id', sessionId)
      .update(updateObj);
    
    return true;
  } catch (error) {
    console.error('Error updating collaboration session:', error);
    throw error;
  }
};

/**
 * End collaboration session
 * @param {string} sessionId - Session ID
 * @returns {Promise<boolean>} - Success status
 */
const endCollaborationSession = async (sessionId) => {
  try {
    // Update session status
    await db('collaboration_sessions')
      .where('id', sessionId)
      .update({
        status: 'ended',
        updated_at: db.fn.now()
      });
    
    return true;
  } catch (error) {
    console.error('Error ending collaboration session:', error);
    throw error;
  }
};

/**
 * Record collaboration activity
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID
 * @param {string} action - Activity action
 * @param {Object} details - Activity details
 * @returns {Promise<string>} - Activity ID
 */
const recordCollaborationActivity = async (sessionId, userId, action, details = {}) => {
  try {
    // Create activity record
    const activityId = uuidv4();
    await db('collaboration_activity').insert({
      id: activityId,
      session_id: sessionId,
      user_id: userId,
      action,
      details: JSON.stringify(details),
      created_at: db.fn.now()
    });
    
    // Update session updated_at
    await db('collaboration_sessions')
      .where('id', sessionId)
      .update({
        updated_at: db.fn.now()
      });
    
    return activityId;
  } catch (error) {
    console.error('Error recording collaboration activity:', error);
    throw error;
  }
};

/**
 * Get session activity
 * @param {string} sessionId - Session ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Activity records
 */
const getSessionActivity = async (sessionId, options = {}) => {
  try {
    const {
      limit = 50,
      offset = 0,
      startDate,
      endDate
    } = options;
    
    // Build query
    let query = db('collaboration_activity')
      .where('session_id', sessionId);
    
    // Apply date filters
    if (startDate) {
      query = query.where('created_at', '>=', startDate);
    }
    
    if (endDate) {
      query = query.where('created_at', '<=', endDate);
    }
    
    // Apply pagination
    query = query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    // Get activity
    const activity = await query;
    
    // Get user IDs
    const userIds = [...new Set(activity.map(a => a.user_id))];
    
    // Get users
    const users = await db('users')
      .whereIn('id', userIds)
      .select('id', 'first_name', 'last_name', 'email', 'profile_image');
    
    // Create user lookup
    const userLookup = {};
    users.forEach(user => {
      userLookup[user.id] = user;
    });
    
    // Format activity
    return activity.map(a => ({
      id: a.id,
      user: userLookup[a.user_id] || { id: a.user_id },
      action: a.action,
      details: a.details ? JSON.parse(a.details) : null,
      created_at: a.created_at
    }));
  } catch (error) {
    console.error('Error getting session activity:', error);
    throw error;
  }
};

/**
 * Check if user is session participant
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Participant status
 */
const isSessionParticipant = async (sessionId, userId) => {
  try {
    // Get participant
    const participant = await db('collaboration_participants')
      .where('session_id', sessionId)
      .where('user_id', userId)
      .first();
    
    if (!participant) {
      return {
        isParticipant: false
      };
    }
    
    return {
      isParticipant: true,
      role: participant.role,
      status: participant.status
    };
  } catch (error) {
    console.error('Error checking session participant:', error);
    throw error;
  }
};

module.exports = {
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
};
