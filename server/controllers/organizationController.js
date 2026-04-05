const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { db } = require('../config/db');
const { ApiError } = require('../middleware/errorMiddleware');
const { generateAndStoreOTP } = require('../services/otpService');

/**
 * @desc    Get organization details
 * @route   GET /api/v1/organizations
 * @access  Private
 */
const getOrganization = async (req, res, next) => {
  try {
    const orgId = req.user.org_id;

    // Get organization details
    const organization = await db('organizations')
      .where({ id: orgId })
      .first();

    if (!organization) {
      return next(new ApiError(404, 'Organization not found'));
    }

    // Get subscription details
    const subscription = await db('subscriptions')
      .join('plans', 'subscriptions.plan_id', 'plans.id')
      .where('subscriptions.org_id', orgId)
      .where('subscriptions.status', 'active')
      .select(
        'plans.id as plan_id',
        'plans.name as plan_name',
        'plans.envelope_limit',
        'plans.sms_credits',
        'plans.custom_branding',
        'plans.remove_watermark',
        'plans.api_access',
        'plans.priority_support',
        'subscriptions.next_billing_date'
      )
      .first();

    // Get organization users
    const users = await db('users')
      .where({ org_id: orgId })
      .select('id', 'email', 'first_name', 'last_name', 'role', 'is_active', 'is_email_verified', 'last_login', 'created_at')
      .orderBy('created_at', 'asc');

    res.status(200).json({
      success: true,
      data: {
        organization,
        subscription: subscription || null,
        users
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update organization details
 * @route   PUT /api/v1/organizations
 * @access  Private (Organization Admin only)
 */
const updateOrganization = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { name, email, phone, address, city, state, postal_code, country, vat_number, registration_number } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if organization exists
    const organization = await db('organizations')
      .where({ id: orgId })
      .first();

    if (!organization) {
      return next(new ApiError(404, 'Organization not found'));
    }

    // Update organization
    await db('organizations')
      .where({ id: orgId })
      .update({
        name: name || organization.name,
        email: email || organization.email,
        phone: phone !== undefined ? phone : organization.phone,
        address: address !== undefined ? address : organization.address,
        city: city !== undefined ? city : organization.city,
        state: state !== undefined ? state : organization.state,
        postal_code: postal_code !== undefined ? postal_code : organization.postal_code,
        country: country || organization.country,
        vat_number: vat_number !== undefined ? vat_number : organization.vat_number,
        registration_number: registration_number !== undefined ? registration_number : organization.registration_number,
        updated_at: db.fn.now()
      });

    // Log event
    await db('system_logs').insert({
      user_id: userId,
      action: 'organization_updated',
      metadata: JSON.stringify({
        org_id: orgId,
        org_name: name || organization.name
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Get updated organization
    const updatedOrganization = await db('organizations')
      .where({ id: orgId })
      .first();

    res.status(200).json({
      success: true,
      message: 'Organization updated successfully',
      data: { organization: updatedOrganization }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update organization branding
 * @route   PUT /api/v1/organizations/branding
 * @access  Private (Organization Admin only)
 */
const updateBranding = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if organization exists
    const organization = await db('organizations')
      .where({ id: orgId })
      .first();

    if (!organization) {
      return next(new ApiError(404, 'Organization not found'));
    }

    // Check subscription for branding permissions
    const subscription = await db('subscriptions')
      .join('plans', 'subscriptions.plan_id', 'plans.id')
      .where('subscriptions.org_id', orgId)
      .where('subscriptions.status', 'active')
      .select('plans.custom_branding')
      .first();

    if (!subscription || !subscription.custom_branding) {
      return next(new ApiError(403, 'Your current plan does not support custom branding. Please upgrade your subscription.'));
    }

    // Set up multer for logo upload
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/logos');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${orgId}-${uniqueSuffix}${ext}`);
      }
    });

    const upload = multer({
      storage,
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
      fileFilter: (req, file, cb) => {
        // Only allow image files
        if (file.mimetype.startsWith('image/')) {
          return cb(null, true);
        }
        cb(new Error('Only image files are allowed'));
      }
    }).single('logo');

    // Handle upload
    upload(req, res, async (err) => {
      if (err) {
        return next(new ApiError(400, err.message));
      }

      try {
        // Extract form data
        const { primary_color, secondary_color } = req.body;

        // Update branding
        const updateData = {
          updated_at: db.fn.now()
        };

        if (primary_color) {
          updateData.primary_color = primary_color;
        }

        if (secondary_color) {
          updateData.secondary_color = secondary_color;
        }

        // If logo was uploaded, update logo path
        if (req.file) {
          // Delete old logo if exists
          if (organization.logo_path && fs.existsSync(organization.logo_path)) {
            fs.unlinkSync(organization.logo_path);
          }

          updateData.logo_path = req.file.path;
        }

        // Update organization
        await db('organizations')
          .where({ id: orgId })
          .update(updateData);

        // Log event
        await db('system_logs').insert({
          user_id: userId,
          action: 'organization_branding_updated',
          metadata: JSON.stringify({
            org_id: orgId,
            logo_updated: !!req.file,
            colors_updated: !!(primary_color || secondary_color)
          }),
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        });

        // Get updated organization
        const updatedOrganization = await db('organizations')
          .where({ id: orgId })
          .first();

        res.status(200).json({
          success: true,
          message: 'Organization branding updated successfully',
          data: { 
            organization: {
              id: updatedOrganization.id,
              name: updatedOrganization.name,
              logo_path: updatedOrganization.logo_path,
              primary_color: updatedOrganization.primary_color,
              secondary_color: updatedOrganization.secondary_color
            }
          }
        });
      } catch (error) {
        // Clean up the file if there was an error
        if (req.file && req.file.path) {
          fs.unlinkSync(req.file.path);
        }
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get organization users
 * @route   GET /api/v1/organizations/users
 * @access  Private
 */
const getUsers = async (req, res, next) => {
  try {
    const orgId = req.user.org_id;
    const { page = 1, limit = 10 } = req.query;

    // Get total count
    const totalCount = await db('users')
      .where({ org_id: orgId })
      .count('id as count')
      .first();

    // Get users with pagination
    const users = await db('users')
      .where({ org_id: orgId })
      .select('id', 'email', 'first_name', 'last_name', 'role', 'is_active', 'is_email_verified', 'last_login', 'created_at')
      .orderBy('created_at', 'asc')
      .limit(limit)
      .offset((page - 1) * limit);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          total: parseInt(totalCount.count),
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount.count / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Invite user to organization
 * @route   POST /api/v1/organizations/users/invite
 * @access  Private (Organization Admin only)
 */
const inviteUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { email, first_name, last_name, role } = req.body;
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // Check if user already exists
    const existingUser = await db('users').where({ email }).first();
    if (existingUser) {
      return next(new ApiError(400, 'User already exists with this email'));
    }

    // Validate role
    if (!['user', 'org_admin'].includes(role)) {
      return next(new ApiError(400, 'Invalid role. Must be either user or org_admin'));
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).toUpperCase().slice(-4) + '!';
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    // Create user
    const [newUserId] = await db('users').insert({
      id: uuidv4(),
      email,
      password: hashedPassword,
      first_name,
      last_name,
      org_id: orgId,
      role,
      is_active: true,
      is_email_verified: false,
      verification_token: crypto.randomBytes(32).toString('hex')
    }).returning('id');

    // Send invitation email with OTP
    await generateAndStoreOTP(newUserId, 'email', email);

    // Log event
    await db('system_logs').insert({
      user_id: userId,
      action: 'user_invited',
      metadata: JSON.stringify({
        invited_user_id: newUserId,
        invited_user_email: email,
        invited_user_role: role
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(201).json({
      success: true,
      message: 'User invited successfully. A verification email has been sent.',
      data: {
        user: {
          id: newUserId,
          email,
          first_name,
          last_name,
          role,
          is_active: true,
          is_email_verified: false
        },
        temp_password: tempPassword
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user role
 * @route   PUT /api/v1/organizations/users/:id/role
 * @access  Private (Organization Admin only)
 */
const updateUserRole = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { id } = req.params;
    const { role } = req.body;
    const adminUserId = req.user.id;
    const orgId = req.user.org_id;

    // Validate role
    if (!['user', 'org_admin'].includes(role)) {
      return next(new ApiError(400, 'Invalid role. Must be either user or org_admin'));
    }

    // Check if user exists and belongs to organization
    const user = await db('users')
      .where({ id, org_id: orgId })
      .first();

    if (!user) {
      return next(new ApiError(404, 'User not found or does not belong to your organization'));
    }

    // Prevent self-demotion
    if (id === adminUserId) {
      return next(new ApiError(400, 'You cannot change your own role'));
    }

    // Update user role
    await db('users')
      .where({ id })
      .update({
        role,
        updated_at: db.fn.now()
      });

    // Log event
    await db('system_logs').insert({
      user_id: adminUserId,
      action: 'user_role_updated',
      metadata: JSON.stringify({
        target_user_id: id,
        target_user_email: user.email,
        old_role: user.role,
        new_role: role
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'User role updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Deactivate user
 * @route   PUT /api/v1/organizations/users/:id/deactivate
 * @access  Private (Organization Admin only)
 */
const deactivateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user.id;
    const orgId = req.user.org_id;

    // Check if user exists and belongs to organization
    const user = await db('users')
      .where({ id, org_id: orgId })
      .first();

    if (!user) {
      return next(new ApiError(404, 'User not found or does not belong to your organization'));
    }

    // Prevent self-deactivation
    if (id === adminUserId) {
      return next(new ApiError(400, 'You cannot deactivate your own account'));
    }

    // Deactivate user
    await db('users')
      .where({ id })
      .update({
        is_active: false,
        updated_at: db.fn.now()
      });

    // Log event
    await db('system_logs').insert({
      user_id: adminUserId,
      action: 'user_deactivated',
      metadata: JSON.stringify({
        target_user_id: id,
        target_user_email: user.email
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reactivate user
 * @route   PUT /api/v1/organizations/users/:id/reactivate
 * @access  Private (Organization Admin only)
 */
const reactivateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user.id;
    const orgId = req.user.org_id;

    // Check if user exists and belongs to organization
    const user = await db('users')
      .where({ id, org_id: orgId })
      .first();

    if (!user) {
      return next(new ApiError(404, 'User not found or does not belong to your organization'));
    }

    // Reactivate user
    await db('users')
      .where({ id })
      .update({
        is_active: true,
        updated_at: db.fn.now()
      });

    // Log event
    await db('system_logs').insert({
      user_id: adminUserId,
      action: 'user_reactivated',
      metadata: JSON.stringify({
        target_user_id: id,
        target_user_email: user.email
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'User reactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Check if organization requires watermark based on subscription
 * @route   GET /api/v1/organizations/:id/watermark-check
 * @access  Public
 */
const checkWatermarkRequirement = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new ApiError(400, 'Organization ID is required'));
    }

    // First check if organization exists
    const organization = await db('organizations')
      .where({ id })
      .first();

    if (!organization) {
      return next(new ApiError(404, 'Organization not found'));
    }

    // Check if organization has an active subscription with watermark removal
    const subscription = await db('subscriptions')
      .join('plans', 'subscriptions.plan_id', 'plans.id')
      .where('subscriptions.org_id', id)
      .where('subscriptions.status', 'active')
      .select('plans.remove_watermark')
      .first();

    // If no active subscription or plan doesn't include watermark removal, watermark is required
    const requiresWatermark = !subscription || !subscription.remove_watermark;

    // Log the watermark check for audit purposes
    await db('audit_trail').insert({
      action: 'WATERMARK_CHECK',
      user_id: null,
      org_id: id,
      resource_type: 'organization',
      resource_id: id,
      details: JSON.stringify({
        requiresWatermark,
        subscriptionActive: !!subscription,
        watermarkRemoved: subscription ? subscription.remove_watermark : false
      }),
      ip_address: req.ip || req.headers['x-forwarded-for'] || 'unknown'
    });

    res.status(200).json({
      requiresWatermark
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get organization usage metrics
 * @route   GET /api/v1/organizations/:id/usage
 * @access  Private
 */
const getOrganizationUsage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.org_id;
    
    // Ensure the requested organization matches the user's organization
    if (id !== orgId) {
      return next(new ApiError(403, 'You can only access usage for your own organization'));
    }

    // Get current subscription and plan details
    const subscription = await db('subscriptions')
      .join('plans', 'subscriptions.plan_id', 'plans.id')
      .where('subscriptions.org_id', orgId)
      .where('subscriptions.status', 'active')
      .select(
        'plans.name as plan',
        'plans.envelope_limit as envelopesLimit',
        'plans.sms_credits as smsLimit',
        'subscriptions.next_billing_date as nextBillingDate'
      )
      .first();
    
    if (!subscription) {
      return next(new ApiError(404, 'No active subscription found for this organization'));
    }

    // Get envelope usage for current billing period
    const billingStartDate = new Date(subscription.nextBillingDate);
    billingStartDate.setMonth(billingStartDate.getMonth() - 1);
    
    const envelopeUsage = await db('envelopes')
      .where('org_id', orgId)
      .where('created_at', '>=', billingStartDate)
      .count('id as count')
      .first();

    // Get SMS usage for current billing period
    const smsUsage = await db('sms_logs')
      .where('org_id', orgId)
      .where('created_at', '>=', billingStartDate)
      .sum('count as total')
      .first();

    // Format the response
    const usageData = {
      plan: subscription.plan,
      envelopesUsed: parseInt(envelopeUsage.count) || 0,
      envelopesLimit: subscription.envelopesLimit,
      smsUsed: parseInt(smsUsage.total) || 0,
      smsLimit: subscription.smsLimit,
      nextBillingDate: subscription.nextBillingDate
    };

    return res.status(200).json({
      status: 'success',
      data: usageData
    });
  } catch (error) {
    console.error('Error getting organization usage:', error);
    return next(new ApiError(500, 'Failed to get organization usage'));
  }
};

module.exports = {
  getOrganization,
  updateOrganization,
  updateBranding,
  getUsers,
  inviteUser,
  updateUserRole,
  deactivateUser,
  reactivateUser,
  checkWatermarkRequirement,
  getOrganizationUsage
};
