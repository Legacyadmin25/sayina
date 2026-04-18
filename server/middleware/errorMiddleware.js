/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle 404 errors
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  // Log error (omit stack trace in production to avoid leaking internals)
  console.error('Error:', {
    message: err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Determine if this is a validation error
  const isValidationError = err.errors && Array.isArray(err.errors) && err.errors.length > 0;

  // Format response
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(isValidationError && { errors: err.errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * Async handler to avoid try/catch blocks in route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Validation error handler for express-validator
 */
const validationErrorHandler = (req, res, next) => {
  const { validationErrors } = req;
  if (validationErrors && validationErrors.length > 0) {
    return next(new ApiError(400, 'Validation Error', validationErrors));
  }
  next();
};

module.exports = {
  ApiError,
  notFound,
  errorHandler,
  asyncHandler,
  validationErrorHandler
};
