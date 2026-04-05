const express = require('express');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const collaborationController = require('../controllers/collaborationController');

const router = express.Router();

/**
 * @route   POST /api/v1/collaboration/sessions
 * @desc    Create a collaboration session
 * @access  Private
 */
router.post(
  '/sessions',
  protect,
  verifiedEmail,
  collaborationController.createSession
);

/**
 * @route   GET /api/v1/collaboration/sessions
 * @desc    Get user's collaboration sessions
 * @access  Private
 */
router.get(
  '/sessions',
  protect,
  collaborationController.getUserSessions
);

/**
 * @route   GET /api/v1/collaboration/sessions/:id
 * @desc    Get collaboration session details
 * @access  Private
 */
router.get(
  '/sessions/:id',
  protect,
  collaborationController.getSession
);

/**
 * @route   PUT /api/v1/collaboration/sessions/:id
 * @desc    Update collaboration session
 * @access  Private
 */
router.put(
  '/sessions/:id',
  protect,
  verifiedEmail,
  collaborationController.updateSession
);

/**
 * @route   POST /api/v1/collaboration/sessions/:id/end
 * @desc    End collaboration session
 * @access  Private
 */
router.post(
  '/sessions/:id/end',
  protect,
  verifiedEmail,
  collaborationController.endSession
);

/**
 * @route   POST /api/v1/collaboration/sessions/:id/participants
 * @desc    Add participant to session
 * @access  Private
 */
router.post(
  '/sessions/:id/participants',
  protect,
  verifiedEmail,
  collaborationController.addParticipant
);

/**
 * @route   DELETE /api/v1/collaboration/sessions/:id/participants/:userId
 * @desc    Remove participant from session
 * @access  Private
 */
router.delete(
  '/sessions/:id/participants/:userId',
  protect,
  collaborationController.removeParticipant
);

/**
 * @route   PUT /api/v1/collaboration/sessions/:id/participants/:userId
 * @desc    Update participant role
 * @access  Private
 */
router.put(
  '/sessions/:id/participants/:userId',
  protect,
  verifiedEmail,
  collaborationController.updateParticipant
);

/**
 * @route   GET /api/v1/collaboration/sessions/:id/activity
 * @desc    Get session activity
 * @access  Private
 */
router.get(
  '/sessions/:id/activity',
  protect,
  collaborationController.getActivity
);

/**
 * @route   POST /api/v1/collaboration/sessions/:id/activity
 * @desc    Record activity
 * @access  Private
 */
router.post(
  '/sessions/:id/activity',
  protect,
  collaborationController.recordActivity
);

module.exports = router;
