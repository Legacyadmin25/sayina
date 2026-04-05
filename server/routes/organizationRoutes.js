const express = require('express');
const { body, param } = require('express-validator');
const { protect, verifiedEmail, orgAdmin } = require('../middleware/authMiddleware');
const { validationErrorHandler } = require('../middleware/errorMiddleware');
const organizationController = require('../controllers/organizationController');

const router = express.Router();

// Separate public routes that don't need authentication

/**
 * @route   GET /api/v1/organizations/:id/watermark-check
 * @desc    Check if organization requires watermark based on subscription
 * @access  Public
 */
router.get(
  '/:id/watermark-check',
  [
    param('id').isUUID().withMessage('Invalid organization ID format'),
    validationErrorHandler
  ],
  organizationController.checkWatermarkRequirement
);

// Apply authentication middleware to all remaining routes
router.use(protect);
router.use(verifiedEmail);

/**
 * @route   GET /api/v1/organizations
 * @desc    Get organization details
 * @access  Private
 */
router.get('/', organizationController.getOrganization);

/**
 * @route   GET /api/v1/organizations/:id/usage
 * @desc    Get organization usage metrics
 * @access  Private
 */
router.get(
  '/:id/usage',
  [
    param('id').isUUID().withMessage('Invalid organization ID format'),
    validationErrorHandler
  ],
  organizationController.getOrganizationUsage
);

/**
 * @route   PUT /api/v1/organizations
 * @desc    Update organization details
 * @access  Private (Organization Admin only)
 */
router.put(
  '/',
  orgAdmin,
  [
    body('name').optional().trim().notEmpty().withMessage('Organization name cannot be empty'),
    body('email').optional().isEmail().withMessage('Please provide a valid email'),
    body('phone').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
    body('address').optional().trim(),
    body('city').optional().trim(),
    body('state').optional().trim(),
    body('postal_code').optional().trim(),
    body('country').optional().trim(),
    body('vat_number').optional().trim(),
    body('registration_number').optional().trim(),
    validationErrorHandler
  ],
  organizationController.updateOrganization
);

/**
 * @route   PUT /api/v1/organizations/branding
 * @desc    Update organization branding
 * @access  Private (Organization Admin only)
 */
router.put(
  '/branding',
  orgAdmin,
  organizationController.updateBranding
);

/**
 * @route   GET /api/v1/organizations/users
 * @desc    Get organization users
 * @access  Private
 */
router.get('/users', organizationController.getUsers);

/**
 * @route   POST /api/v1/organizations/users/invite
 * @desc    Invite user to organization
 * @access  Private (Organization Admin only)
 */
router.post(
  '/users/invite',
  orgAdmin,
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('first_name').trim().notEmpty().withMessage('First name is required'),
    body('last_name').trim().notEmpty().withMessage('Last name is required'),
    body('role').isIn(['user', 'org_admin']).withMessage('Role must be either user or org_admin'),
    validationErrorHandler
  ],
  organizationController.inviteUser
);

/**
 * @route   PUT /api/v1/organizations/users/:id/role
 * @desc    Update user role
 * @access  Private (Organization Admin only)
 */
router.put(
  '/users/:id/role',
  orgAdmin,
  [
    param('id').isUUID().withMessage('Invalid user ID format'),
    body('role').isIn(['user', 'org_admin']).withMessage('Role must be either user or org_admin'),
    validationErrorHandler
  ],
  organizationController.updateUserRole
);

/**
 * @route   PUT /api/v1/organizations/users/:id/deactivate
 * @desc    Deactivate user
 * @access  Private (Organization Admin only)
 */
router.put(
  '/users/:id/deactivate',
  orgAdmin,
  [
    param('id').isUUID().withMessage('Invalid user ID format'),
    validationErrorHandler
  ],
  organizationController.deactivateUser
);

/**
 * @route   PUT /api/v1/organizations/users/:id/reactivate
 * @desc    Reactivate user
 * @access  Private (Organization Admin only)
 */
router.put(
  '/users/:id/reactivate',
  orgAdmin,
  [
    param('id').isUUID().withMessage('Invalid user ID format'),
    validationErrorHandler
  ],
  organizationController.reactivateUser
);

module.exports = router;
