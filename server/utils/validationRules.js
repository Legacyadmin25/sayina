const { body, param, query } = require('express-validator');
const { isValidSAPhoneNumber } = require('./smsHelper');

/**
 * Authentication validation rules
 */
const authValidation = {
  // Registration validation
  register: [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('first_name')
      .notEmpty()
      .withMessage('First name is required')
      .isLength({ max: 50 })
      .withMessage('First name cannot exceed 50 characters'),
    body('last_name')
      .notEmpty()
      .withMessage('Last name is required')
      .isLength({ max: 50 })
      .withMessage('Last name cannot exceed 50 characters'),
    body('phone')
      .optional()
      .custom(value => {
        if (value && !isValidSAPhoneNumber(value)) {
          throw new Error('Please provide a valid South African phone number');
        }
        return true;
      }),
    body('org_name')
      .notEmpty()
      .withMessage('Organization name is required')
      .isLength({ max: 100 })
      .withMessage('Organization name cannot exceed 100 characters'),
    body('terms_accepted')
      .isBoolean()
      .equals('true')
      .withMessage('You must accept the terms and conditions')
  ],

  // Login validation
  login: [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  // Password reset request validation
  forgotPassword: [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail()
  ],

  // Password reset validation
  resetPassword: [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
  ],

  // Change password validation
  changePassword: [
    body('current_password')
      .notEmpty()
      .withMessage('Current password is required'),
    body('new_password')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
  ],

  // Email verification validation
  verifyEmail: [
    param('token')
      .notEmpty()
      .withMessage('Verification token is required')
  ]
};

/**
 * OTP validation rules
 */
const otpValidation = {
  // Send OTP validation
  sendOtp: [
    body('phone')
      .notEmpty()
      .withMessage('Phone number is required')
      .custom(value => {
        if (!isValidSAPhoneNumber(value)) {
          throw new Error('Please provide a valid South African phone number');
        }
        return true;
      }),
    body('purpose')
      .notEmpty()
      .withMessage('Purpose is required')
      .isIn(['verification', 'login', 'document_signing', 'password_reset'])
      .withMessage('Invalid OTP purpose')
  ],

  // Verify OTP validation
  verifyOtp: [
    body('phone')
      .notEmpty()
      .withMessage('Phone number is required')
      .custom(value => {
        if (!isValidSAPhoneNumber(value)) {
          throw new Error('Please provide a valid South African phone number');
        }
        return true;
      }),
    body('otp')
      .notEmpty()
      .withMessage('OTP is required')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be 6 digits')
      .isNumeric()
      .withMessage('OTP must contain only numbers'),
    body('purpose')
      .notEmpty()
      .withMessage('Purpose is required')
      .isIn(['verification', 'login', 'document_signing', 'password_reset'])
      .withMessage('Invalid OTP purpose')
  ]
};

/**
 * User validation rules
 */
const userValidation = {
  // Update profile validation
  updateProfile: [
    body('first_name')
      .optional()
      .isLength({ max: 50 })
      .withMessage('First name cannot exceed 50 characters'),
    body('last_name')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Last name cannot exceed 50 characters'),
    body('phone')
      .optional()
      .custom(value => {
        if (value && !isValidSAPhoneNumber(value)) {
          throw new Error('Please provide a valid South African phone number');
        }
        return true;
      })
  ],

  // Update notification settings validation
  updateNotificationSettings: [
    body('email_notifications')
      .isBoolean()
      .withMessage('Email notifications must be a boolean value'),
    body('sms_notifications')
      .isBoolean()
      .withMessage('SMS notifications must be a boolean value')
  ],

  // Update 2FA settings validation
  update2FASettings: [
    body('two_factor_enabled')
      .isBoolean()
      .withMessage('Two-factor authentication setting must be a boolean value'),
    body('two_factor_method')
      .optional()
      .isIn(['sms', 'app'])
      .withMessage('Two-factor method must be either sms or app')
  ]
};

/**
 * Organization validation rules
 */
const organizationValidation = {
  // Update organization validation
  updateOrganization: [
    body('name')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Organization name cannot exceed 100 characters'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('phone')
      .optional()
      .custom(value => {
        if (value && !isValidSAPhoneNumber(value)) {
          throw new Error('Please provide a valid South African phone number');
        }
        return true;
      }),
    body('address')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Address cannot exceed 200 characters'),
    body('city')
      .optional()
      .isLength({ max: 50 })
      .withMessage('City cannot exceed 50 characters'),
    body('postal_code')
      .optional()
      .isLength({ max: 10 })
      .withMessage('Postal code cannot exceed 10 characters'),
    body('country')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Country cannot exceed 50 characters'),
    body('vat_number')
      .optional()
      .isLength({ max: 20 })
      .withMessage('VAT number cannot exceed 20 characters')
  ],

  // Update branding validation
  updateBranding: [
    body('primary_color')
      .optional()
      .matches(/^#[0-9A-F]{6}$/i)
      .withMessage('Primary color must be a valid hex color code'),
    body('logo_url')
      .optional()
      .isURL()
      .withMessage('Logo URL must be a valid URL'),
    body('email_template')
      .optional()
      .isIn(['default', 'minimal', 'corporate', 'modern'])
      .withMessage('Invalid email template')
  ],

  // Invite user validation
  inviteUser: [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('role')
      .isIn(['org_admin', 'org_member'])
      .withMessage('Role must be either org_admin or org_member')
  ]
};

/**
 * Document validation rules
 */
const documentValidation = {
  // Upload document validation
  uploadDocument: [
    body('name')
      .notEmpty()
      .withMessage('Document name is required')
      .isLength({ max: 100 })
      .withMessage('Document name cannot exceed 100 characters')
  ],

  // Get document validation
  getDocument: [
    param('id')
      .notEmpty()
      .withMessage('Document ID is required')
      .isUUID()
      .withMessage('Invalid document ID format')
  ],

  // Delete document validation
  deleteDocument: [
    param('id')
      .notEmpty()
      .withMessage('Document ID is required')
      .isUUID()
      .withMessage('Invalid document ID format')
  ]
};

/**
 * Envelope validation rules
 */
const envelopeValidation = {
  // Create envelope validation
  createEnvelope: [
    body('name')
      .notEmpty()
      .withMessage('Envelope name is required')
      .isLength({ max: 100 })
      .withMessage('Envelope name cannot exceed 100 characters'),
    body('message')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Message cannot exceed 500 characters'),
    body('expiry_days')
      .optional()
      .isInt({ min: 1, max: 90 })
      .withMessage('Expiry days must be between 1 and 90')
  ],

  // Get envelope validation
  getEnvelope: [
    param('id')
      .notEmpty()
      .withMessage('Envelope ID is required')
      .isUUID()
      .withMessage('Invalid envelope ID format')
  ],

  // Update envelope validation
  updateEnvelope: [
    param('id')
      .notEmpty()
      .withMessage('Envelope ID is required')
      .isUUID()
      .withMessage('Invalid envelope ID format'),
    body('name')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Envelope name cannot exceed 100 characters'),
    body('message')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Message cannot exceed 500 characters'),
    body('expiry_days')
      .optional()
      .isInt({ min: 1, max: 90 })
      .withMessage('Expiry days must be between 1 and 90')
  ],

  // Send envelope validation
  sendEnvelope: [
    param('id')
      .notEmpty()
      .withMessage('Envelope ID is required')
      .isUUID()
      .withMessage('Invalid envelope ID format')
  ]
};

/**
 * Signer validation rules
 */
const signerValidation = {
  // Add signer validation
  addSigner: [
    param('envelopeId')
      .notEmpty()
      .withMessage('Envelope ID is required')
      .isUUID()
      .withMessage('Invalid envelope ID format'),
    body('name')
      .notEmpty()
      .withMessage('Signer name is required')
      .isLength({ max: 100 })
      .withMessage('Signer name cannot exceed 100 characters'),
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('phone')
      .optional()
      .custom(value => {
        if (value && !isValidSAPhoneNumber(value)) {
          throw new Error('Please provide a valid South African phone number');
        }
        return true;
      }),
    body('role')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Role cannot exceed 50 characters'),
    body('order')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Order must be a positive integer')
  ],

  // Update signer validation
  updateSigner: [
    param('id')
      .notEmpty()
      .withMessage('Signer ID is required')
      .isUUID()
      .withMessage('Invalid signer ID format'),
    body('name')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Signer name cannot exceed 100 characters'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('phone')
      .optional()
      .custom(value => {
        if (value && !isValidSAPhoneNumber(value)) {
          throw new Error('Please provide a valid South African phone number');
        }
        return true;
      }),
    body('role')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Role cannot exceed 50 characters'),
    body('order')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Order must be a positive integer')
  ],

  // Delete signer validation
  deleteSigner: [
    param('id')
      .notEmpty()
      .withMessage('Signer ID is required')
      .isUUID()
      .withMessage('Invalid signer ID format')
  ],

  // Send reminder validation
  sendReminder: [
    param('id')
      .notEmpty()
      .withMessage('Signer ID is required')
      .isUUID()
      .withMessage('Invalid signer ID format'),
    body('message')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Message cannot exceed 500 characters')
  ]
};

/**
 * Field validation rules
 */
const fieldValidation = {
  // Add field validation
  addField: [
    param('documentId')
      .notEmpty()
      .withMessage('Document ID is required')
      .isUUID()
      .withMessage('Invalid document ID format'),
    body('signer_id')
      .notEmpty()
      .withMessage('Signer ID is required')
      .isUUID()
      .withMessage('Invalid signer ID format'),
    body('type')
      .notEmpty()
      .withMessage('Field type is required')
      .isIn(['signature', 'initial', 'date', 'text', 'checkbox', 'name', 'email', 'company', 'title'])
      .withMessage('Invalid field type'),
    body('page')
      .notEmpty()
      .withMessage('Page number is required')
      .isInt({ min: 1 })
      .withMessage('Page number must be a positive integer'),
    body('x_position')
      .notEmpty()
      .withMessage('X position is required')
      .isFloat({ min: 0, max: 100 })
      .withMessage('X position must be between 0 and 100'),
    body('y_position')
      .notEmpty()
      .withMessage('Y position is required')
      .isFloat({ min: 0, max: 100 })
      .withMessage('Y position must be between 0 and 100'),
    body('width')
      .notEmpty()
      .withMessage('Width is required')
      .isFloat({ min: 0, max: 100 })
      .withMessage('Width must be between 0 and 100'),
    body('height')
      .notEmpty()
      .withMessage('Height is required')
      .isFloat({ min: 0, max: 100 })
      .withMessage('Height must be between 0 and 100'),
    body('required')
      .optional()
      .isBoolean()
      .withMessage('Required must be a boolean value'),
    body('label')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Label cannot exceed 50 characters')
  ],

  // Update field validation
  updateField: [
    param('id')
      .notEmpty()
      .withMessage('Field ID is required')
      .isUUID()
      .withMessage('Invalid field ID format'),
    body('type')
      .optional()
      .isIn(['signature', 'initial', 'date', 'text', 'checkbox', 'name', 'email', 'company', 'title'])
      .withMessage('Invalid field type'),
    body('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page number must be a positive integer'),
    body('x_position')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('X position must be between 0 and 100'),
    body('y_position')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Y position must be between 0 and 100'),
    body('width')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Width must be between 0 and 100'),
    body('height')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Height must be between 0 and 100'),
    body('required')
      .optional()
      .isBoolean()
      .withMessage('Required must be a boolean value'),
    body('label')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Label cannot exceed 50 characters')
  ],

  // Delete field validation
  deleteField: [
    param('id')
      .notEmpty()
      .withMessage('Field ID is required')
      .isUUID()
      .withMessage('Invalid field ID format')
  ]
};

/**
 * Billing validation rules
 */
const billingValidation = {
  // Create subscription validation
  createSubscription: [
    body('plan_id')
      .notEmpty()
      .withMessage('Plan ID is required')
      .isUUID()
      .withMessage('Invalid plan ID format')
  ],

  // Cancel subscription validation
  cancelSubscription: [
    param('id')
      .notEmpty()
      .withMessage('Subscription ID is required')
      .isUUID()
      .withMessage('Invalid subscription ID format')
  ],

  // Top up SMS credits validation
  topUpSmsCredits: [
    body('amount')
      .notEmpty()
      .withMessage('Amount is required')
      .isInt({ min: 100 })
      .withMessage('Amount must be at least 100 credits')
  ]
};

/**
 * API key validation rules
 */
const apiKeyValidation = {
  // Create API key validation
  createApiKey: [
    body('name')
      .notEmpty()
      .withMessage('API key name is required')
      .isLength({ max: 50 })
      .withMessage('API key name cannot exceed 50 characters'),
    body('permissions')
      .optional()
      .isObject()
      .withMessage('Permissions must be an object')
  ],

  // Delete API key validation
  deleteApiKey: [
    param('id')
      .notEmpty()
      .withMessage('API key ID is required')
      .isUUID()
      .withMessage('Invalid API key ID format')
  ]
};

module.exports = {
  authValidation,
  otpValidation,
  userValidation,
  organizationValidation,
  documentValidation,
  envelopeValidation,
  signerValidation,
  fieldValidation,
  billingValidation,
  apiKeyValidation
};
