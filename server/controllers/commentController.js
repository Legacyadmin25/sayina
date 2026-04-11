const { v4: uuidv4 } = require('uuid');
const { ApiError } = require('../middleware/errorMiddleware');
const db = require('../config/db');
const { logSystemEvent } = require('../services/loggerService');
const { sendEnvelopeNotification } = require('./notificationController');
const { sanitizeInput } = require('../utils/securityHelper');

/**
 * @desc    Add comment to envelope
 * @route   POST /api/v1/comments/envelope/:envelopeId
 * @access  Private
 */
const addEnvelopeComment = async (req, res, next) => {
  try {
    const { envelopeId } = req.params;
    const { content, is_private } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Validate content
    if (!content || content.trim() === '') {
      return next(new ApiError(400, 'Comment content is required'));
    }

    // Check if envelope exists and belongs to organization
    const envelope = await db('envelopes')
      .where('id', envelopeId)
      .where('org_id', orgId)
      .first();

    if (!envelope) {
      return next(new ApiError(404, 'Envelope not found or does not belong to your organization'));
    }

    // Sanitize content
    const sanitizedContent = sanitizeInput(content);

    // Create comment
    const _commentIdResult1 = await db('comments').insert({
      id: uuidv4(),
      envelope_id: envelopeId,
      user_id: userId,
      content: sanitizedContent,
      is_private: is_private === true,
      parent_id: null
    }).returning('id');
    const commentId = _commentIdResult1[0]?.id ?? _commentIdResult1[0];

    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'comment_added',
      metadata: {
        envelope_id: envelopeId,
        comment_id: commentId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Send notification if comment is not private
    if (!is_private) {
      // Get user details
      const user = await db('users')
        .where('id', userId)
        .select('first_name', 'last_name')
        .first();

      await sendEnvelopeNotification(envelopeId, 'comment_added', {
        title: 'New Comment Added',
        message: `${user.first_name} ${user.last_name} added a comment to envelope "${envelope.name}"`,
        comment_content: sanitizedContent.substring(0, 100) + (sanitizedContent.length > 100 ? '...' : '')
      });
    }

    // Get created comment with user details
    const comment = await db('comments')
      .join('users', 'comments.user_id', 'users.id')
      .where('comments.id', commentId)
      .select(
        'comments.*',
        'users.first_name',
        'users.last_name',
        'users.email'
      )
      .first();

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: {
        id: comment.id,
        content: comment.content,
        is_private: comment.is_private,
        created_at: comment.created_at,
        user: {
          id: comment.user_id,
          name: `${comment.first_name} ${comment.last_name}`,
          email: comment.email
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add comment to document
 * @route   POST /api/v1/comments/document/:documentId
 * @access  Private
 */
const addDocumentComment = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { content, is_private, page, x_position, y_position } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Validate content
    if (!content || content.trim() === '') {
      return next(new ApiError(400, 'Comment content is required'));
    }

    // Check if document exists and belongs to organization
    const document = await db('documents')
      .where('id', documentId)
      .where('org_id', orgId)
      .first();

    if (!document) {
      return next(new ApiError(404, 'Document not found or does not belong to your organization'));
    }

    // Get envelope
    const envelope = await db('envelopes')
      .where('id', document.envelope_id)
      .first();

    // Sanitize content
    const sanitizedContent = sanitizeInput(content);

    // Create comment
    const _commentIdResult2 = await db('comments').insert({
      id: uuidv4(),
      document_id: documentId,
      envelope_id: document.envelope_id,
      user_id: userId,
      content: sanitizedContent,
      is_private: is_private === true,
      page: page || null,
      x_position: x_position || null,
      y_position: y_position || null,
      parent_id: null
    }).returning('id');
    const commentId = _commentIdResult2[0]?.id ?? _commentIdResult2[0];

    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'comment_added',
      metadata: {
        document_id: documentId,
        envelope_id: document.envelope_id,
        comment_id: commentId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Send notification if comment is not private
    if (!is_private) {
      // Get user details
      const user = await db('users')
        .where('id', userId)
        .select('first_name', 'last_name')
        .first();

      await sendEnvelopeNotification(document.envelope_id, 'comment_added', {
        title: 'New Comment Added',
        message: `${user.first_name} ${user.last_name} added a comment to document "${document.name}" in envelope "${envelope.name}"`,
        comment_content: sanitizedContent.substring(0, 100) + (sanitizedContent.length > 100 ? '...' : '')
      });
    }

    // Get created comment with user details
    const comment = await db('comments')
      .join('users', 'comments.user_id', 'users.id')
      .where('comments.id', commentId)
      .select(
        'comments.*',
        'users.first_name',
        'users.last_name',
        'users.email'
      )
      .first();

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: {
        id: comment.id,
        content: comment.content,
        is_private: comment.is_private,
        page: comment.page,
        x_position: comment.x_position,
        y_position: comment.y_position,
        created_at: comment.created_at,
        user: {
          id: comment.user_id,
          name: `${comment.first_name} ${comment.last_name}`,
          email: comment.email
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reply to comment
 * @route   POST /api/v1/comments/:commentId/reply
 * @access  Private
 */
const replyToComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { content, is_private } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Validate content
    if (!content || content.trim() === '') {
      return next(new ApiError(400, 'Reply content is required'));
    }

    // Check if parent comment exists
    const parentComment = await db('comments')
      .where('id', commentId)
      .first();

    if (!parentComment) {
      return next(new ApiError(404, 'Parent comment not found'));
    }

    // Check if envelope belongs to organization
    const envelope = await db('envelopes')
      .where('id', parentComment.envelope_id)
      .where('org_id', orgId)
      .first();

    if (!envelope) {
      return next(new ApiError(403, 'You do not have permission to reply to this comment'));
    }

    // Sanitize content
    const sanitizedContent = sanitizeInput(content);

    // Create reply
    const _replyIdResult = await db('comments').insert({
      id: uuidv4(),
      envelope_id: parentComment.envelope_id,
      document_id: parentComment.document_id,
      user_id: userId,
      content: sanitizedContent,
      is_private: is_private === true,
      page: parentComment.page,
      x_position: parentComment.x_position,
      y_position: parentComment.y_position,
      parent_id: commentId
    }).returning('id');
    const replyId = _replyIdResult[0]?.id ?? _replyIdResult[0];

    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'comment_reply_added',
      metadata: {
        envelope_id: parentComment.envelope_id,
        document_id: parentComment.document_id,
        parent_comment_id: commentId,
        reply_id: replyId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Send notification if reply is not private
    if (!is_private) {
      // Get user details
      const user = await db('users')
        .where('id', userId)
        .select('first_name', 'last_name')
        .first();

      // Get parent comment user
      const parentCommentUser = await db('users')
        .where('id', parentComment.user_id)
        .select('id', 'first_name', 'last_name')
        .first();

      // Notify parent comment user
      if (parentCommentUser && parentCommentUser.id !== userId) {
        await sendEnvelopeNotification(parentComment.envelope_id, 'comment_reply', {
          title: 'New Reply to Your Comment',
          message: `${user.first_name} ${user.last_name} replied to your comment in envelope "${envelope.name}"`,
          comment_content: sanitizedContent.substring(0, 100) + (sanitizedContent.length > 100 ? '...' : '')
        });
      }
    }

    // Get created reply with user details
    const reply = await db('comments')
      .join('users', 'comments.user_id', 'users.id')
      .where('comments.id', replyId)
      .select(
        'comments.*',
        'users.first_name',
        'users.last_name',
        'users.email'
      )
      .first();

    res.status(201).json({
      success: true,
      message: 'Reply added successfully',
      data: {
        id: reply.id,
        content: reply.content,
        is_private: reply.is_private,
        parent_id: reply.parent_id,
        created_at: reply.created_at,
        user: {
          id: reply.user_id,
          name: `${reply.first_name} ${reply.last_name}`,
          email: reply.email
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get envelope comments
 * @route   GET /api/v1/comments/envelope/:envelopeId
 * @access  Private
 */
const getEnvelopeComments = async (req, res, next) => {
  try {
    const { envelopeId } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if envelope exists and belongs to organization
    const envelope = await db('envelopes')
      .where('id', envelopeId)
      .where('org_id', orgId)
      .first();

    if (!envelope) {
      return next(new ApiError(404, 'Envelope not found or does not belong to your organization'));
    }

    // Get comments
    const comments = await db('comments')
      .join('users', 'comments.user_id', 'users.id')
      .where('comments.envelope_id', envelopeId)
      .where(function() {
        this.where('comments.is_private', false)
          .orWhere('comments.user_id', userId);
      })
      .whereNull('comments.parent_id')
      .select(
        'comments.*',
        'users.first_name',
        'users.last_name',
        'users.email'
      )
      .orderBy('comments.created_at', 'desc');

    // Get replies
    const commentIds = comments.map(comment => comment.id);
    let replies = [];
    
    if (commentIds.length > 0) {
      replies = await db('comments')
        .join('users', 'comments.user_id', 'users.id')
        .whereIn('comments.parent_id', commentIds)
        .where(function() {
          this.where('comments.is_private', false)
            .orWhere('comments.user_id', userId);
        })
        .select(
          'comments.*',
          'users.first_name',
          'users.last_name',
          'users.email'
        )
        .orderBy('comments.created_at', 'asc');
    }

    // Format comments and replies
    const formattedComments = comments.map(comment => {
      const commentReplies = replies.filter(reply => reply.parent_id === comment.id)
        .map(reply => ({
          id: reply.id,
          content: reply.content,
          is_private: reply.is_private,
          created_at: reply.created_at,
          user: {
            id: reply.user_id,
            name: `${reply.first_name} ${reply.last_name}`,
            email: reply.email
          }
        }));

      return {
        id: comment.id,
        content: comment.content,
        is_private: comment.is_private,
        document_id: comment.document_id,
        page: comment.page,
        x_position: comment.x_position,
        y_position: comment.y_position,
        created_at: comment.created_at,
        user: {
          id: comment.user_id,
          name: `${comment.first_name} ${comment.last_name}`,
          email: comment.email
        },
        replies: commentReplies
      };
    });

    res.status(200).json({
      success: true,
      count: formattedComments.length,
      data: formattedComments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get document comments
 * @route   GET /api/v1/comments/document/:documentId
 * @access  Private
 */
const getDocumentComments = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if document exists and belongs to organization
    const document = await db('documents')
      .where('id', documentId)
      .where('org_id', orgId)
      .first();

    if (!document) {
      return next(new ApiError(404, 'Document not found or does not belong to your organization'));
    }

    // Get comments
    const comments = await db('comments')
      .join('users', 'comments.user_id', 'users.id')
      .where('comments.document_id', documentId)
      .where(function() {
        this.where('comments.is_private', false)
          .orWhere('comments.user_id', userId);
      })
      .whereNull('comments.parent_id')
      .select(
        'comments.*',
        'users.first_name',
        'users.last_name',
        'users.email'
      )
      .orderBy('comments.created_at', 'desc');

    // Get replies
    const commentIds = comments.map(comment => comment.id);
    let replies = [];
    
    if (commentIds.length > 0) {
      replies = await db('comments')
        .join('users', 'comments.user_id', 'users.id')
        .whereIn('comments.parent_id', commentIds)
        .where(function() {
          this.where('comments.is_private', false)
            .orWhere('comments.user_id', userId);
        })
        .select(
          'comments.*',
          'users.first_name',
          'users.last_name',
          'users.email'
        )
        .orderBy('comments.created_at', 'asc');
    }

    // Format comments and replies
    const formattedComments = comments.map(comment => {
      const commentReplies = replies.filter(reply => reply.parent_id === comment.id)
        .map(reply => ({
          id: reply.id,
          content: reply.content,
          is_private: reply.is_private,
          created_at: reply.created_at,
          user: {
            id: reply.user_id,
            name: `${reply.first_name} ${reply.last_name}`,
            email: reply.email
          }
        }));

      return {
        id: comment.id,
        content: comment.content,
        is_private: comment.is_private,
        page: comment.page,
        x_position: comment.x_position,
        y_position: comment.y_position,
        created_at: comment.created_at,
        user: {
          id: comment.user_id,
          name: `${comment.first_name} ${comment.last_name}`,
          email: comment.email
        },
        replies: commentReplies
      };
    });

    res.status(200).json({
      success: true,
      count: formattedComments.length,
      data: formattedComments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update comment
 * @route   PUT /api/v1/comments/:id
 * @access  Private
 */
const updateComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, is_private } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if comment exists and belongs to user
    const comment = await db('comments')
      .where('id', id)
      .first();

    if (!comment) {
      return next(new ApiError(404, 'Comment not found'));
    }

    if (comment.user_id !== userId) {
      return next(new ApiError(403, 'You can only update your own comments'));
    }

    // Check if envelope belongs to organization
    const envelope = await db('envelopes')
      .where('id', comment.envelope_id)
      .where('org_id', orgId)
      .first();

    if (!envelope) {
      return next(new ApiError(403, 'You do not have permission to update this comment'));
    }

    // Validate content
    if (content !== undefined && (content === null || content.trim() === '')) {
      return next(new ApiError(400, 'Comment content cannot be empty'));
    }

    // Sanitize content
    const sanitizedContent = content ? sanitizeInput(content) : undefined;

    // Update comment
    await db('comments')
      .where('id', id)
      .update({
        content: sanitizedContent || comment.content,
        is_private: is_private !== undefined ? is_private : comment.is_private,
        updated_at: db.fn.now()
      });

    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'comment_updated',
      metadata: {
        envelope_id: comment.envelope_id,
        document_id: comment.document_id,
        comment_id: id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Get updated comment
    const updatedComment = await db('comments')
      .join('users', 'comments.user_id', 'users.id')
      .where('comments.id', id)
      .select(
        'comments.*',
        'users.first_name',
        'users.last_name',
        'users.email'
      )
      .first();

    res.status(200).json({
      success: true,
      message: 'Comment updated successfully',
      data: {
        id: updatedComment.id,
        content: updatedComment.content,
        is_private: updatedComment.is_private,
        document_id: updatedComment.document_id,
        page: updatedComment.page,
        x_position: updatedComment.x_position,
        y_position: updatedComment.y_position,
        created_at: updatedComment.created_at,
        updated_at: updatedComment.updated_at,
        user: {
          id: updatedComment.user_id,
          name: `${updatedComment.first_name} ${updatedComment.last_name}`,
          email: updatedComment.email
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete comment
 * @route   DELETE /api/v1/comments/:id
 * @access  Private
 */
const deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.org_id;
    const userRole = req.user.role;

    // Check if comment exists
    const comment = await db('comments')
      .where('id', id)
      .first();

    if (!comment) {
      return next(new ApiError(404, 'Comment not found'));
    }

    // Check if envelope belongs to organization
    const envelope = await db('envelopes')
      .where('id', comment.envelope_id)
      .where('org_id', orgId)
      .first();

    if (!envelope) {
      return next(new ApiError(403, 'You do not have permission to delete this comment'));
    }

    // Check if user is authorized to delete the comment
    if (comment.user_id !== userId && userRole !== 'org_admin') {
      return next(new ApiError(403, 'You can only delete your own comments'));
    }

    // Delete replies first
    await db('comments')
      .where('parent_id', id)
      .delete();

    // Delete comment
    await db('comments')
      .where('id', id)
      .delete();

    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'comment_deleted',
      metadata: {
        envelope_id: comment.envelope_id,
        document_id: comment.document_id,
        comment_id: id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addEnvelopeComment,
  addDocumentComment,
  replyToComment,
  getEnvelopeComments,
  getDocumentComments,
  updateComment,
  deleteComment
};
