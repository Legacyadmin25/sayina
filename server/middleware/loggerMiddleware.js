/**
 * Logger Middleware
 * 
 * This middleware integrates Winston and Morgan for HTTP request logging
 */

const morgan = require('morgan');
const logger = require('../config/winston');

// Define custom Morgan token for request body
morgan.token('body', (req) => {
  const body = { ...req.body };
  
  // Remove sensitive information
  if (body.password) body.password = '[REDACTED]';
  if (body.credit_card) body.credit_card = '[REDACTED]';
  if (body.token) body.token = '[REDACTED]';
  if (body.api_key) body.api_key = '[REDACTED]';
  
  return JSON.stringify(body);
});

// Define custom Morgan token for response body (in development only)
morgan.token('response', (req, res) => {
  if (process.env.NODE_ENV !== 'development') return '';
  
  const rawResponse = res.__morgan_body_response;
  if (!rawResponse) return '';
  
  try {
    const parsedResponse = JSON.parse(rawResponse);
    
    // Remove sensitive information
    if (parsedResponse.token) parsedResponse.token = '[REDACTED]';
    if (parsedResponse.data && parsedResponse.data.token) parsedResponse.data.token = '[REDACTED]';
    
    return JSON.stringify(parsedResponse);
  } catch (e) {
    return '';
  }
});

// Custom format that includes method, url, status, response time, and request body
const morganFormat = ':remote-addr :method :url :status :response-time ms - :body';

// Create middleware
const loggerMiddleware = morgan(morganFormat, { stream: logger.stream });

// Response body capture middleware (for development only)
const responseCapture = (req, res, next) => {
  if (process.env.NODE_ENV !== 'development') return next();
  
  // Store original write and end functions
  const originalWrite = res.write;
  const originalEnd = res.end;
  
  // Create a buffer to hold response chunks
  const chunks = [];
  
  // Override write function
  res.write = function(chunk) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return originalWrite.apply(res, arguments);
  };
  
  // Override end function
  res.end = function(chunk) {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const body = Buffer.concat(chunks).toString('utf8');
    res.__morgan_body_response = body;
    return originalEnd.apply(res, arguments);
  };
  
  next();
};

// Error logger
const errorLogger = (err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    user: req.user ? req.user.id : 'unauthenticated'
  });
  
  next(err);
};

module.exports = {
  loggerMiddleware,
  responseCapture,
  errorLogger
};
