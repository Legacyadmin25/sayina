const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

const assetBaseUrlRaw = process.env.ASSET_BASE_URL || process.env.CDN_BASE_URL || process.env.CLIENT_URL || process.env.API_URL || '';
const assetBaseUrl = assetBaseUrlRaw.replace(/\/$/, '');
const ABSOLUTE_ASSET_PATTERN = /^(https?:|cid:|data:)/i;
let assetBaseWarningLogged = false;

const resolveOrganizationLogo = (logoPath) => {
  if (!logoPath) {
    return null;
  }

  const trimmed = logoPath.toString().trim();
  if (!trimmed) {
    return null;
  }

  if (ABSOLUTE_ASSET_PATTERN.test(trimmed)) {
    return trimmed;
  }

  let normalized = trimmed.replace(/\\/g, '/');
  const uploadsIndex = normalized.toLowerCase().lastIndexOf('/uploads/');
  if (uploadsIndex !== -1) {
    normalized = normalized.substring(uploadsIndex);
  }

  if (!normalized.startsWith('/uploads/')) {
    normalized = `/uploads/${normalized.replace(/^\/+/,'')}`;
  }

  if (!assetBaseUrl) {
    if (!assetBaseWarningLogged) {
      console.warn('[emailService] ASSET_BASE_URL/CLIENT_URL/API_URL not configured; email logos will be skipped to avoid leaking file paths.');
      assetBaseWarningLogged = true;
    }
    return null;
  }

  return `${assetBaseUrl}${normalized}`;
};

const buildBrandingContext = (payload = {}) => {
  return {
    organizationName: payload.organizationName || payload.organization_name || 'Sayina',
    organizationLogo: resolveOrganizationLogo(payload.organizationLogo || payload.organization_logo)
  };
};

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

/**
 * Load and compile email template
 * @param {string} templateName - Name of the template file (without extension)
 * @returns {Function} - Compiled template function
 */
const loadTemplate = (templateName) => {
  const templatePath = path.join(__dirname, `../templates/emails/${templateName}.html`);
  const templateSource = fs.readFileSync(templatePath, 'utf-8');
  return handlebars.compile(templateSource);
};

/**
 * Send email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @param {Array} attachments - Email attachments (optional)
 * @returns {Promise<Object>} - Nodemailer send mail response
 */
const sendEmail = async (to, subject, html, attachments = []) => {
  try {
    const transporter = createTransporter();
    
    const fromName = process.env.EMAIL_FROM_NAME || 'Sayina';
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || 'info@sayina.co.za';
    const mailOptions = {
      from: `"${fromName}" <${fromAddress}>`,
      to,
      subject,
      html,
      attachments
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send OTP email
 * @param {string} to - Recipient email
 * @param {string} name - Recipient name
 * @param {Object} data - Template data
 * @returns {Promise<Object>} - Send mail response
 */
const sendOtpEmail = async (to, name, data) => {
  try {
    const template = loadTemplate('otp');
    const branding = buildBrandingContext(data);
    const html = template({
      name,
      otp: data.otp,
      purpose: data.purpose,
      expiryMinutes: data.expiryMinutes,
      organizationName: branding.organizationName,
      organizationLogo: branding.organizationLogo,
      year: new Date().getFullYear()
    });
    
    return await sendEmail(
      to,
      `Your One-Time Password (OTP) for ${data.purpose}`,
      html
    );
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send welcome email
 * @param {string} to - Recipient email
 * @param {string} name - Recipient name
 * @param {Object} data - Template data
 * @returns {Promise<Object>} - Send mail response
 */
const sendWelcomeEmail = async (to, name, data) => {
  try {
    const template = loadTemplate('welcome');
    const branding = buildBrandingContext(data);
    const html = template({
      name,
      loginUrl: data.loginUrl,
      organizationName: branding.organizationName,
      organizationLogo: branding.organizationLogo,
      year: new Date().getFullYear()
    });
    
    return await sendEmail(
      to,
      `Welcome to ${data.organizationName || 'Sayina'} E-Signature Service`,
      html
    );
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send password reset email
 * @param {string} to - Recipient email
 * @param {string} name - Recipient name
 * @param {Object} data - Template data
 * @returns {Promise<Object>} - Send mail response
 */
const sendPasswordResetEmail = async (to, name, data) => {
  try {
    const template = loadTemplate('password-reset');
    const branding = buildBrandingContext(data);
    const html = template({
      name,
      resetUrl: data.resetUrl,
      expiryHours: data.expiryHours,
      organizationName: branding.organizationName,
      organizationLogo: branding.organizationLogo,
      year: new Date().getFullYear()
    });
    
    return await sendEmail(
      to,
      'Reset Your Password',
      html
    );
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send signing invitation email
 * @param {string} to - Recipient email
 * @param {string} name - Recipient name
 * @param {Object} data - Template data
 * @returns {Promise<Object>} - Send mail response
 */
const sendSigningInvitation = async (to, name, data) => {
  try {
    const template = loadTemplate('signing-invitation');
    const branding = buildBrandingContext(data);
    const html = template({
      name,
      envelopeName: data.envelope_name,
      envelopeMessage: data.envelope_message,
      customMessage: data.custom_message,
      documents: data.documents,
      signingUrl: data.signing_url,
      organizationName: branding.organizationName,
      organizationLogo: branding.organizationLogo,
      isReminder: data.is_reminder || false,
      year: new Date().getFullYear()
    });
    
    const subject = data.is_reminder 
      ? `Reminder: Please sign "${data.envelope_name}"`
      : `Please sign "${data.envelope_name}"`;
    
    return await sendEmail(
      to,
      subject,
      html
    );
  } catch (error) {
    console.error('Error sending signing invitation email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send envelope completed email
 * @param {string} to - Recipient email
 * @param {string} name - Recipient name
 * @param {Object} data - Template data
 * @returns {Promise<Object>} - Send mail response
 */
const sendEnvelopeCompletedEmail = async (to, name, data) => {
  try {
    const template = loadTemplate('envelope-completed');
    const branding = buildBrandingContext(data);
    const html = template({
      name,
      envelopeName: data.envelope_name,
      documents: data.documents,
      downloadUrl: data.download_url,
      organizationName: branding.organizationName,
      organizationLogo: branding.organizationLogo,
      year: new Date().getFullYear()
    });
    
    // Prepare attachments if provided
    const attachments = [];
    if (data.attachments && Array.isArray(data.attachments)) {
      data.attachments.forEach(attachment => {
        attachments.push({
          filename: attachment.filename,
          path: attachment.path,
          contentType: 'application/pdf'
        });
      });
    }
    
    return await sendEmail(
      to,
      `Completed: "${data.envelope_name}"`,
      html,
      attachments
    );
  } catch (error) {
    console.error('Error sending envelope completed email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send user invitation email
 * @param {string} to - Recipient email
 * @param {string} name - Recipient name
 * @param {Object} data - Template data
 * @returns {Promise<Object>} - Send mail response
 */
const sendUserInvitationEmail = async (to, name, data) => {
  try {
    const template = loadTemplate('user-invitation');
    const branding = buildBrandingContext(data);
    const html = template({
      name,
      inviterName: data.inviter_name,
      organizationName: branding.organizationName,
      role: data.role,
      tempPassword: data.temp_password,
      loginUrl: data.login_url,
      organizationLogo: branding.organizationLogo,
      year: new Date().getFullYear()
    });
    
    return await sendEmail(
      to,
      `You've been invited to join ${data.organization_name} on Sayina`,
      html
    );
  } catch (error) {
    console.error('Error sending user invitation email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send subscription confirmation email
 * @param {string} to - Recipient email
 * @param {string} name - Recipient name
 * @param {Object} data - Template data
 * @returns {Promise<Object>} - Send mail response
 */
const sendSubscriptionConfirmationEmail = async (to, name, data) => {
  try {
    const template = loadTemplate('subscription-confirmation');
    const branding = buildBrandingContext(data);
    const html = template({
      name,
      planName: data.plan_name,
      amount: data.amount,
      currency: data.currency,
      nextBillingDate: data.next_billing_date,
      organizationName: branding.organizationName,
      organizationLogo: branding.organizationLogo,
      year: new Date().getFullYear()
    });
    
    return await sendEmail(
      to,
      `Subscription Confirmation: ${data.plan_name} Plan`,
      html
    );
  } catch (error) {
    console.error('Error sending subscription confirmation email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send SMS top-up confirmation email
 * @param {string} to - Recipient email
 * @param {string} name - Recipient name
 * @param {Object} data - Template data
 * @returns {Promise<Object>} - Send mail response
 */
const sendSmsTopupConfirmationEmail = async (to, name, data) => {
  try {
    const template = loadTemplate('sms-topup-confirmation');
    const branding = buildBrandingContext(data);
    const html = template({
      name,
      credits: data.credits,
      amount: data.amount,
      currency: data.currency,
      currentBalance: data.current_balance,
      organizationName: branding.organizationName,
      organizationLogo: branding.organizationLogo,
      year: new Date().getFullYear()
    });
    
    return await sendEmail(
      to,
      'SMS Credits Top-up Confirmation',
      html
    );
  } catch (error) {
    console.error('Error sending SMS top-up confirmation email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail,
  sendOtpEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendSigningInvitation,
  sendEnvelopeCompletedEmail,
  sendUserInvitationEmail,
  sendSubscriptionConfirmationEmail,
  sendSmsTopupConfirmationEmail
};
