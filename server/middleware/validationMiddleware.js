const { validationResult } = require('express-validator');
const { ApiError } = require('./errorMiddleware');

/**
 * Middleware to handle validation errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validationErrorHandler = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ApiError(400, 'Validation error', errors.array()));
  }
  next();
};

/**
 * Middleware to validate UUID format
 * @param {string} value - Value to validate
 * @param {Object} req - Express request object
 * @returns {boolean} - True if valid UUID
 */
const isUUID = (value) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

/**
 * Middleware to validate email format
 * @param {string} value - Value to validate
 * @param {Object} req - Express request object
 * @returns {boolean} - True if valid email
 */
const isEmail = (value) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(value);
};

/**
 * Middleware to validate phone number format
 * @param {string} value - Value to validate
 * @param {Object} req - Express request object
 * @returns {boolean} - True if valid phone number
 */
const isPhoneNumber = (value) => {
  // South African phone number format
  const phoneRegex = /^(\+27|0)[6-8][0-9]{8}$/;
  return phoneRegex.test(value);
};

/**
 * Middleware to validate password strength
 * @param {string} value - Value to validate
 * @param {Object} req - Express request object
 * @returns {boolean} - True if valid password
 */
const isStrongPassword = (value) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(value);
};

/**
 * Middleware to validate date format
 * @param {string} value - Value to validate
 * @param {Object} req - Express request object
 * @returns {boolean} - True if valid date
 */
const isDate = (value) => {
  // ISO date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) {
    return false;
  }
  
  const date = new Date(value);
  return date instanceof Date && !isNaN(date);
};

/**
 * Middleware to validate URL format
 * @param {string} value - Value to validate
 * @param {Object} req - Express request object
 * @returns {boolean} - True if valid URL
 */
const isURL = (value) => {
  try {
    new URL(value);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Middleware to validate hex color format
 * @param {string} value - Value to validate
 * @param {Object} req - Express request object
 * @returns {boolean} - True if valid hex color
 */
const isHexColor = (value) => {
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexColorRegex.test(value);
};

/**
 * Middleware to validate file size
 * @param {number} maxSize - Maximum file size in bytes
 * @returns {Function} - Middleware function
 */
const validateFileSize = (maxSize) => {
  return (req, res, next) => {
    if (!req.file) {
      return next();
    }
    
    if (req.file.size > maxSize) {
      return next(new ApiError(400, `File size exceeds the maximum limit of ${maxSize / (1024 * 1024)} MB`));
    }
    
    next();
  };
};

/**
 * Middleware to validate file type
 * @param {Array} allowedTypes - Array of allowed MIME types
 * @returns {Function} - Middleware function
 */
const validateFileType = (allowedTypes) => {
  return (req, res, next) => {
    if (!req.file) {
      return next();
    }
    
    if (!allowedTypes.includes(req.file.mimetype)) {
      return next(new ApiError(400, `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`));
    }
    
    next();
  };
};

/**
 * Middleware to validate file extension
 * @param {Array} allowedExtensions - Array of allowed file extensions
 * @returns {Function} - Middleware function
 */
const validateFileExtension = (allowedExtensions) => {
  return (req, res, next) => {
    if (!req.file) {
      return next();
    }
    
    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return next(new ApiError(400, `File extension not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`));
    }
    
    next();
  };
};

module.exports = {
  validationErrorHandler,
  isUUID,
  isEmail,
  isPhoneNumber,
  isStrongPassword,
  isDate,
  isURL,
  isHexColor,
  validateFileSize,
  validateFileType,
  validateFileExtension
};
