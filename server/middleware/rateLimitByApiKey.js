/**
 * API Key Rate Limiting Middleware
 * 
 * This middleware applies rate limits based on API keys to prevent abuse.
 * Different rate limits are applied to different routes and HTTP methods.
 */

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for API endpoints that uses API key as the rate limiting key
 */
const keyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: (req, res) => {
    // Apply tighter limits on resource-intensive operations
    const route = req.path;
    
    // Envelope creation is limited to 10 per minute per API key
    if (route.startsWith('/api/v1/envelopes') && req.method === 'POST') {
      return 10;
    }
    
    // Document operations are limited to 20 per minute per API key
    if (route.startsWith('/api/v1/documents') && (req.method === 'POST' || req.method === 'PUT')) {
      return 20;
    }
    
    // Bulk operations are limited to 5 per minute per API key
    if (route.includes('/bulk') || route.includes('/batch')) {
      return 5;
    }
    
    // Signing operations have higher limits (50 per minute)
    if (route.includes('/sign') || route.includes('/field')) {
      return 50;
    }
    
    // Default limit for all other API endpoints
    return 100; // 100 general calls per minute
  },
  
  // Use the API key as the rate limiting key
  keyGenerator: (req) => {
    // If the request has an API key (from apiKeyMiddleware), use it
    if (req.apiKey && req.apiKey.id) {
      return req.apiKey.id;
    }
    
    // If no API key, fall back to IP address
    return req.ip;
  },
  
  // Custom response when rate limit is exceeded
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests, please slow down.',
      status: 429,
      message: 'API rate limit exceeded. Please reduce your request frequency.'
    });
  },
  
  // Enable header with remaining requests
  standardHeaders: true,
  
  // Disable legacy X-RateLimit headers
  legacyHeaders: false,
  
  // Skip rate limiting for certain paths
  skip: (req) => {
    // Skip rate limiting for health check and public endpoints
    return req.path === '/health' || req.path === '/api/v1/public';
  }
});

module.exports = keyLimiter;
