const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const { ApiError } = require('./errorMiddleware');
const { logSecurityEvent } = require('../services/loggerService');

// Create Redis client if Redis URL is provided
let redisClient;
if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL);
}

/**
 * Configure store based on environment
 */
const configureStore = () => {
  // Use Redis store if Redis client is available
  if (redisClient) {
    return new RedisStore({
      // @ts-expect-error - Known issue with @types/rate-limit-redis
      sendCommand: (...args) => redisClient.call(...args),
      prefix: 'rl:sayina:'
    });
  }
  
  // Otherwise use memory store (default)
  return undefined;
};

/**
 * Global rate limiter for all API routes
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  store: configureStore(),
  handler: (req, res, next) => {
    // Log rate limit exceeded
    logSecurityEvent({
      user_id: req.user ? req.user.id : null,
      event_type: 'rate_limit_exceeded',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      metadata: {
        path: req.path,
        method: req.method
      }
    }).catch(console.error);
    
    // Return error response
    next(new ApiError(429, 'Too many requests, please try again later'));
  }
});

/**
 * Authentication rate limiter for login and registration
 */
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 login/registration attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  store: configureStore(),
  handler: (req, res, next) => {
    // Log auth rate limit exceeded
    logSecurityEvent({
      user_id: null,
      event_type: 'auth_rate_limit_exceeded',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      metadata: {
        path: req.path,
        method: req.method,
        email: req.body.email
      }
    }).catch(console.error);
    
    // Return error response
    next(new ApiError(429, 'Too many authentication attempts, please try again later'));
  }
});

/**
 * OTP rate limiter for sending OTPs
 */
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 OTP requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  store: configureStore(),
  handler: (req, res, next) => {
    // Log OTP rate limit exceeded
    logSecurityEvent({
      user_id: req.user ? req.user.id : null,
      event_type: 'otp_rate_limit_exceeded',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      metadata: {
        path: req.path,
        method: req.method,
        phone: req.body.phone
      }
    }).catch(console.error);
    
    // Return error response
    next(new ApiError(429, 'Too many OTP requests, please try again later'));
  }
});

/**
 * API key rate limiter for API access
 */
const apiKeyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each API key to 60 requests per minute (1 req/sec)
  standardHeaders: true,
  legacyHeaders: false,
  store: configureStore(),
  keyGenerator: (req) => {
    // Use API key from request as rate limit key
    return req.headers['x-api-key'] || req.ip;
  },
  handler: (req, res, next) => {
    // Log API key rate limit exceeded
    logSecurityEvent({
      user_id: req.user ? req.user.id : null,
      event_type: 'api_key_rate_limit_exceeded',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      metadata: {
        path: req.path,
        method: req.method,
        api_key: req.headers['x-api-key'] ? '***' : null
      }
    }).catch(console.error);
    
    // Return error response
    next(new ApiError(429, 'API rate limit exceeded, please reduce request frequency'));
  }
});

/**
 * Webhook rate limiter
 */
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 webhook requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  store: configureStore(),
  handler: (req, res, next) => {
    // Log webhook rate limit exceeded
    logSecurityEvent({
      user_id: null,
      event_type: 'webhook_rate_limit_exceeded',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      metadata: {
        path: req.path,
        method: req.method
      }
    }).catch(console.error);
    
    // Return error response
    next(new ApiError(429, 'Webhook rate limit exceeded'));
  }
});

/**
 * Document upload rate limiter
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 uploads per hour
  standardHeaders: true,
  legacyHeaders: false,
  store: configureStore(),
  handler: (req, res, next) => {
    // Log upload rate limit exceeded
    logSecurityEvent({
      user_id: req.user ? req.user.id : null,
      event_type: 'upload_rate_limit_exceeded',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      metadata: {
        path: req.path,
        method: req.method
      }
    }).catch(console.error);
    
    // Return error response
    next(new ApiError(429, 'Upload rate limit exceeded, please try again later'));
  }
});

module.exports = {
  globalLimiter,
  authLimiter,
  otpLimiter,
  apiKeyLimiter,
  webhookLimiter,
  uploadLimiter
};
