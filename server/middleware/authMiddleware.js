const jwt = require('jsonwebtoken');
const { db } = require('../config/db');
const { ApiError } = require('./errorMiddleware');

/**
 * Protect routes - verify JWT token and set user in req
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return next(new ApiError(401, 'Not authorized, no token provided'));
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if token is expired
      if (decoded.exp < Date.now() / 1000) {
        return next(new ApiError(401, 'Token expired, please login again'));
      }

      // Get user from database
      const user = await db('users')
        .where({ id: decoded.id })
        .select('id', 'email', 'first_name', 'last_name', 'role', 'org_id', 'is_active', 'is_email_verified')
        .first();

      // Check if user exists
      if (!user) {
        return next(new ApiError(401, 'Not authorized, user not found'));
      }

      // Check if user is active (knexSnakeCaseMappers converts to camelCase — support both)
      if (!(user.isActive ?? user.is_active)) {
        return next(new ApiError(401, 'Account is deactivated, please contact support'));
      }

      // Normalize org_id (knexSnakeCaseMappers returns orgId, controllers expect org_id)
      user.org_id = user.orgId ?? user.org_id;

      // Set user in request
      req.user = user;
      next();
    } catch (error) {
      return next(new ApiError(401, 'Not authorized, invalid token'));
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Admin only middleware
 */
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    next(new ApiError(403, 'Not authorized as an admin'));
  }
};

/**
 * Organization admin middleware
 */
const orgAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'org_admin')) {
    next();
  } else {
    next(new ApiError(403, 'Not authorized as an organization admin'));
  }
};

/**
 * Verify email middleware
 */
const verifiedEmail = (req, res, next) => {
  // knexSnakeCaseMappers converts snake_case → camelCase — support both forms
  const isVerified = req.user && (req.user.isEmailVerified ?? req.user.is_email_verified);
  if (isVerified) {
    next();
  } else {
    next(new ApiError(403, 'Email not verified, please verify your email first'));
  }
};

/**
 * Optional auth middleware - sets user in req if token is valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // If no token, continue without setting user
    if (!token) {
      return next();
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database
      const user = await db('users')
        .where({ id: decoded.id })
        .select('id', 'email', 'first_name', 'last_name', 'role', 'org_id', 'is_active', 'is_email_verified')
        .first();

      // Set user in request if found and active
      if (user && user.is_active) {
        req.user = user;
      }
      
      next();
    } catch (error) {
      // Continue without setting user if token is invalid
      next();
    }
  } catch (error) {
    next(error);
  }
};

// Role-based access control middleware
const checkRole = (roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, 'Not authorized for this action'));
  }
  next();
};

/**
 * Protect routes for both authenticated users and signers with tokens
 * This middleware allows access if either:
 * 1. User is authenticated with a valid JWT, or
 * 2. Request has a valid signer token
 */
const protectOrSigner = async (req, res, next) => {
  try {
    let token;
    let isSignerToken = false;

    // Check for Bearer token first
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Then check for signer token in query params or headers
    else if (req.query.signerToken) {
      token = req.query.signerToken;
      isSignerToken = true;
    } else if (req.headers['x-signer-token']) {
      token = req.headers['x-signer-token'];
      isSignerToken = true;
    }

    // If no token found, return unauthorized
    if (!token) {
      return next(new ApiError(401, 'Not authorized, no token provided'));
    }

    try {
      if (isSignerToken) {
        // Verify signer token
        const signer = await db('signers')
          .where({ access_token: token })
          .select('id', 'name', 'email', 'envelope_id', 'status')
          .first();

        if (!signer) {
          return next(new ApiError(401, 'Not authorized, invalid signer token'));
        }

        // Reject signers with terminal statuses
        const invalidStatuses = ['signed', 'declined', 'cancelled'];
        if (invalidStatuses.includes(signer.status)) {
          return next(new ApiError(403, 'Signer access is no longer valid'));
        }

        // Set signer in request
        req.signer = signer;
        req.user = { email: signer.email }; // Set minimal user info for permission checks
        next();
      } else {
        // Verify JWT token (regular user)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if token is expired
        if (decoded.exp < Date.now() / 1000) {
          return next(new ApiError(401, 'Token expired, please login again'));
        }

        // Get user from database
        const user = await db('users')
          .where({ id: decoded.id })
          .select('id', 'email', 'first_name', 'last_name', 'role', 'org_id', 'is_active', 'is_email_verified')
          .first();

        // Check if user exists
        if (!user) {
          return next(new ApiError(401, 'Not authorized, user not found'));
        }

        // Check if user is active
        if (!user.is_active) {
          return next(new ApiError(401, 'Account is deactivated, please contact support'));
        }

        // Set user in request
        req.user = user;
        next();
      }
    } catch (error) {
      return next(new ApiError(401, 'Not authorized, invalid token'));
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  protect,
  admin,
  orgAdmin,
  verifiedEmail,
  optionalAuth,
  checkRole,
  protectOrSigner
};
