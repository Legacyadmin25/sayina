const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { db } = require('../config/db');
const { ApiError } = require('../middleware/errorMiddleware');
const { generateAndStoreOTP, verifyUserOTP } = require('../services/otpService');
const { redisClient } = require('../config/redis');
require('dotenv').config();

/**
 * Generate JWT token
 * @param {string} id - User ID
 * @returns {string} - JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY || '1d'
  });
};

/**
 * Generate refresh token
 * @param {string} id - User ID
 * @returns {string} - Refresh token
 */
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d'
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const registerUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { email, password, first_name, last_name, phone, org_name } = req.body;

    // Check if user already exists
    const existingUser = await db('users').where({ email }).first();
    if (existingUser) {
      return next(new ApiError(400, 'User already exists with this email'));
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Start a transaction
    await db.transaction(async trx => {
      // Create organization
      const orgInsert = await trx('organizations').insert({
        id: uuidv4(),
        name: org_name,
        email: email,
        sms_credits: 15 // Free tier starting credits
      }).returning('id');
      // Knex returns [{id:'uuid'}] in pg — extract the string
      const orgId = orgInsert[0]?.id || orgInsert[0];

      // Create user
      const newUserId = uuidv4();
      await trx('users').insert({
        id: newUserId,
        email,
        password: hashedPassword,
        first_name,
        last_name,
        phone: phone || null,
        org_id: orgId,
        role: 'org_admin', // First user is org admin
        verification_token: crypto.randomBytes(32).toString('hex')
      });
      const userId = newUserId;

      // Create free tier subscription
      await trx('subscriptions').insert({
        id: uuidv4(),
        org_id: orgId,
        plan_id: '11111111-1111-1111-1111-111111111111', // Free tier plan ID
        status: 'active',
        start_date: trx.fn.now(),
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      });

      // Log system event
      await trx('system_logs').insert({
        user_id: userId,
        action: 'user_registered',
        metadata: JSON.stringify({
          user_email: email,
          org_id: orgId,
          org_name: org_name
        }),
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      // Send verification OTP
      await generateAndStoreOTP(userId, 'email', email);
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const loginUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { email, password } = req.body;

    // Check if user exists
    const user = await db('users')
      .where({ email })
      .select('id', 'email', 'password', 'first_name', 'last_name', 'role', 'org_id', 'is_active', 'is_email_verified')
      .first();

    if (!user) {
      return next(new ApiError(401, 'Invalid credentials'));
    }

    // Check if user is active (knexSnakeCaseMappers may return camelCase)
    if (!(user.isActive ?? user.is_active)) {
      return next(new ApiError(401, 'Account is deactivated, please contact support'));
    }

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(new ApiError(401, 'Invalid credentials'));
    }

    // Generate tokens
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Update last login
    await db('users')
      .where({ id: user.id })
      .update({
        last_login: db.fn.now()
      });

    // Log event
    await db('system_logs').insert({
      user_id: user.id,
      action: 'user_login',
      metadata: JSON.stringify({
        user_email: user.email
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Get organization details
    const organization = await db('organizations')
      .where({ id: user.org_id })
      .select('id', 'name', 'email', 'logo_path', 'primary_color', 'secondary_color', 'sms_credits')
      .first();

    // Get subscription details
    const subscription = await db('subscriptions')
      .join('plans', 'subscriptions.plan_id', 'plans.id')
      .where('subscriptions.org_id', user.org_id)
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

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          is_email_verified: user.is_email_verified
        },
        organization: organization || null,
        subscription: subscription || null,
        token,
        refresh_token: refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refresh token
 * @route   POST /api/v1/auth/refresh
 * @access  Public
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return next(new ApiError(400, 'Refresh token is required'));
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);

      // Check if user exists
      const user = await db('users')
        .where({ id: decoded.id })
        .select('id', 'is_active')
        .first();

      if (!user || !(user.isActive ?? user.is_active)) {
        return next(new ApiError(401, 'Invalid refresh token'));
      }

      // Generate new tokens
      const token = generateToken(user.id);
      const newRefreshToken = generateRefreshToken(user.id);

      res.status(200).json({
        success: true,
        data: {
          token,
          refresh_token: newRefreshToken
        }
      });
    } catch (error) {
      return next(new ApiError(401, 'Invalid refresh token'));
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send verification OTP
 * @route   POST /api/v1/auth/send-verification
 * @access  Private
 */
const sendVerificationOTP = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { method } = req.body;

    if (!['email', 'sms'].includes(method)) {
      return next(new ApiError(400, 'Invalid verification method'));
    }

    const user = await db('users')
      .where({ id: userId })
      .select('email', 'phone', 'is_email_verified')
      .first();

    if (!user) {
      return next(new ApiError(404, 'User not found'));
    }

    if (user.is_email_verified) {
      return next(new ApiError(400, 'Email already verified'));
    }

    if (method === 'sms' && !user.phone) {
      return next(new ApiError(400, 'Phone number not available'));
    }

    const destination = method === 'email' ? user.email : user.phone;
    const result = await generateAndStoreOTP(userId, method, destination);

    if (!result.success) {
      return next(new ApiError(500, result.message));
    }

    res.status(200).json({
      success: true,
      message: `Verification code sent to your ${method}`,
      data: {
        expires_in: result.expiresIn
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify email with OTP
 * @route   POST /api/v1/auth/verify-email
 * @access  Private
 */
const verifyEmail = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { otp, method } = req.body;

    if (!otp) {
      return next(new ApiError(400, 'OTP is required'));
    }

    if (!['email', 'sms'].includes(method)) {
      return next(new ApiError(400, 'Invalid verification method'));
    }

    const user = await db('users')
      .where({ id: userId })
      .select('email', 'phone', 'is_email_verified')
      .first();

    if (!user) {
      return next(new ApiError(404, 'User not found'));
    }

    if (user.is_email_verified) {
      return next(new ApiError(400, 'Email already verified'));
    }

    const destination = method === 'email' ? user.email : user.phone;
    const result = await verifyUserOTP(userId, method, destination, otp);

    if (!result.success) {
      return next(new ApiError(400, result.message));
    }

    // Update user as verified
    await db('users')
      .where({ id: userId })
      .update({
        is_email_verified: true,
        verification_token: null,
        updated_at: db.fn.now()
      });

    // Log event
    await db('system_logs').insert({
      user_id: userId,
      action: 'email_verified',
      metadata: JSON.stringify({
        method
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Forgot password
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { email } = req.body;

    // Check if user exists
    const user = await db('users')
      .where({ email })
      .select('id', 'is_active')
      .first();

    if (!user) {
      // Don't reveal if user exists
      return res.status(200).json({
        success: true,
        message: 'If your email is registered, you will receive a password reset link'
      });
    }

    if (!(user.isActive ?? user.is_active)) {
      // Don't reveal if user is inactive
      return res.status(200).json({
        success: true,
        message: 'If your email is registered, you will receive a password reset link'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token
    await db('users')
      .where({ id: user.id })
      .update({
        reset_password_token: resetToken,
        reset_password_expires: resetTokenExpiry,
        updated_at: db.fn.now()
      });

    // Send OTP via email
    const result = await generateAndStoreOTP(user.id, 'email', email);

    if (!result.success) {
      return next(new ApiError(500, 'Failed to send password reset code'));
    }

    // Log event
    await db('system_logs').insert({
      user_id: user.id,
      action: 'password_reset_requested',
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'Password reset code sent to your email',
      data: {
        reset_token: resetToken,
        expires_in: result.expiresIn
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password with OTP
 * @route   POST /api/v1/auth/reset-password
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { email, otp, reset_token, password } = req.body;

    // Check if user exists
    const user = await db('users')
      .where({ 
        email,
        reset_password_token: reset_token
      })
      .where('reset_password_expires', '>', db.fn.now())
      .select('id')
      .first();

    if (!user) {
      return next(new ApiError(400, 'Invalid or expired reset token'));
    }

    // Verify OTP
    const result = await verifyUserOTP(user.id, 'email', email, otp);

    if (!result.success) {
      return next(new ApiError(400, 'Invalid or expired OTP'));
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password
    await db('users')
      .where({ id: user.id })
      .update({
        password: hashedPassword,
        reset_password_token: null,
        reset_password_expires: null,
        updated_at: db.fn.now()
      });

    // Log event
    await db('system_logs').insert({
      user_id: user.id,
      action: 'password_reset_completed',
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password
 * @route   POST /api/v1/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    // Get user
    const user = await db('users')
      .where({ id: userId })
      .select('password')
      .first();

    if (!user) {
      return next(new ApiError(404, 'User not found'));
    }

    // Check if current password matches
    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return next(new ApiError(400, 'Current password is incorrect'));
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    // Update password
    await db('users')
      .where({ id: userId })
      .update({
        password: hashedPassword,
        updated_at: db.fn.now()
      });

    // Log event
    await db('system_logs').insert({
      user_id: userId,
      action: 'password_changed',
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/v1/auth/profile
 * @access  Private
 */
const getUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user details
    const user = await db('users')
      .where({ id: userId })
      .select('id', 'email', 'first_name', 'last_name', 'phone', 'role', 'org_id', 'is_email_verified', 'last_login', 'created_at')
      .first();

    if (!user) {
      return next(new ApiError(404, 'User not found'));
    }

    // Get organization details
    const organization = await db('organizations')
      .where({ id: user.org_id })
      .select('id', 'name', 'email', 'phone', 'address', 'city', 'state', 'postal_code', 'country', 'logo_path', 'primary_color', 'secondary_color', 'sms_credits')
      .first();

    // Get subscription details
    const subscription = await db('subscriptions')
      .join('plans', 'subscriptions.plan_id', 'plans.id')
      .where('subscriptions.org_id', user.org_id)
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

    res.status(200).json({
      success: true,
      data: {
        user,
        organization: organization || null,
        subscription: subscription || null
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/v1/auth/profile
 * @access  Private
 */
const updateUserProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation error', errors.array()));
    }

    const { first_name, last_name, phone } = req.body;
    const userId = req.user.id;

    // Update user
    await db('users')
      .where({ id: userId })
      .update({
        first_name: first_name || db.raw('first_name'),
        last_name: last_name || db.raw('last_name'),
        phone: phone || db.raw('phone'),
        updated_at: db.fn.now()
      });

    // Get updated user
    const user = await db('users')
      .where({ id: userId })
      .select('id', 'email', 'first_name', 'last_name', 'phone', 'role', 'is_email_verified')
      .first();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logoutUser = async (req, res, next) => {
  try {
    // No server-side action needed for JWT-based auth
    // Client should discard tokens

    // Log event if user is authenticated
    if (req.user) {
      await db('system_logs').insert({
        user_id: req.user.id,
        action: 'user_logout',
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend email verification OTP (public — no token needed)
 * @route   POST /api/v1/auth/resend-otp
 * @access  Public
 */
const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return next(new ApiError(400, 'Email is required'));
    }

    const user = await db('users')
      .where({ email })
      .select('id', 'is_email_verified', 'is_active')
      .first();

    // knexSnakeCaseMappers converts results to camelCase — support both forms
    const isActive = user?.isActive ?? user?.is_active;
    const isEmailVerified = user?.isEmailVerified ?? user?.is_email_verified;

    // Don't reveal whether the user exists
    if (!user || !isActive) {
      return res.status(200).json({ success: true, message: 'If your email is registered, a new code has been sent.' });
    }

    if (isEmailVerified) {
      return res.status(200).json({ success: true, message: 'Email is already verified. Please log in.' });
    }

    await generateAndStoreOTP(user.id, 'email', email);

    // TEMP: log OTP to console so admin can recover it while email is being fixed
    try {
      const debugOtp = await redisClient.get(`otp:${user.id}:email:${email}`);
      console.log(`[OTP_LOG] uid=${user.id} email=${email} otp=${debugOtp}`);
    } catch (_) {}

    return res.status(200).json({ success: true, message: 'Verification code resent successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify email OTP (public — no token needed)
 * @route   POST /api/v1/auth/verify-otp
 * @access  Public
 */
const verifyOTPPublic = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return next(new ApiError(400, 'Email and OTP are required'));
    }

    const user = await db('users')
      .where({ email })
      .select('id', 'email', 'first_name', 'last_name', 'role', 'org_id', 'is_email_verified', 'is_active')
      .first();

    if (!user) {
      return next(new ApiError(404, 'User not found'));
    }

    // knexSnakeCaseMappers converts results to camelCase — support both forms
    const isActive = user.isActive ?? user.is_active;
    const isEmailVerified = user.isEmailVerified ?? user.is_email_verified;

    if (!isActive) {
      return next(new ApiError(401, 'Account is deactivated, please contact support'));
    }

    if (isEmailVerified) {
      // Already verified — just issue tokens so they can log in
      const token = generateToken(user.id);
      const refreshToken = generateRefreshToken(user.id);
      return res.status(200).json({
        success: true,
        message: 'Email already verified',
        data: { token, refreshToken, user: { id: user.id, email: user.email, role: user.role } }
      });
    }

    const result = await verifyUserOTP(user.id, 'email', email, otp);
    if (!result.success) {
      return next(new ApiError(400, 'Invalid or expired verification code'));
    }

    // Mark email as verified
    await db('users')
      .where({ id: user.id })
      .update({
        is_email_verified: true,
        verification_token: null,
        updated_at: db.fn.now()
      });

    await db('system_logs').insert({
      user_id: user.id,
      action: 'email_verified',
      metadata: JSON.stringify({ method: 'email' }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Issue tokens so the user lands straight in the dashboard
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: { token, refreshToken, user: { id: user.id, email: user.email, role: user.role } }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  refreshToken,
  sendVerificationOTP,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  getUserProfile,
  updateUserProfile,
  logoutUser,
  resendOTP,
  verifyOTPPublic
};
