const express = require('express');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const { validationErrorHandler } = require('../middleware/errorMiddleware');
const commentController = require('../controllers/commentController');

const router = express.Router();

/**
 * @route   POST /api/v1/comments/envelope/:envelopeId
 * @desc    Add comment to envelope
 * @access  Private
 */
router.post(
  '/envelope/:envelopeId',
  protect,
  verifiedEmail,
  commentController.addEnvelopeComment
);

/**
 * @route   POST /api/v1/comments/document/:documentId
 * @desc    Add comment to document
 * @access  Private
 */
router.post(
  '/document/:documentId',
  protect,
  verifiedEmail,
  commentController.addDocumentComment
);

/**
 * @route   POST /api/v1/comments/:commentId/reply
 * @desc    Reply to comment
 * @access  Private
 */
router.post(
  '/:commentId/reply',
  protect,
  verifiedEmail,
  commentController.replyToComment
);

/**
 * @route   GET /api/v1/comments/envelope/:envelopeId
 * @desc    Get envelope comments
 * @access  Private
 */
router.get(
  '/envelope/:envelopeId',
  protect,
  commentController.getEnvelopeComments
);

/**
 * @route   GET /api/v1/comments/document/:documentId
 * @desc    Get document comments
 * @access  Private
 */
router.get(
  '/document/:documentId',
  protect,
  commentController.getDocumentComments
);

/**
 * @route   PUT /api/v1/comments/:id
 * @desc    Update comment
 * @access  Private
 */
router.put(
  '/:id',
  protect,
  verifiedEmail,
  commentController.updateComment
);

/**
 * @route   DELETE /api/v1/comments/:id
 * @desc    Delete comment
 * @access  Private
 */
router.delete(
  '/:id',
  protect,
  commentController.deleteComment
);

module.exports = router;
