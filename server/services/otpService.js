const axios = require('axios');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { redisClient, storeOTP, getOTP, verifyOTP } = require('../config/redis');
const { db } = require('../config/db');
require('dotenv').config();

/**
 * Generate a random OTP of specified length
 * @param {number} length - Length of OTP
 * @returns {string} - Generated OTP
 */
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  
  return otp;
};

/**
 * Send OTP via SMS using BulkSMS API
 * @param {string} phone - Phone number to send OTP to
 * @param {string} otp - OTP to send
 * @returns {Promise<object>} - Response from BulkSMS API
 */
const sendSMSOTP = async (phone, otp) => {
  try {
    // Format phone number to international format if needed
    let formattedPhone = phone;
    if (!phone.startsWith('+')) {
      // Assume South African number if no country code
      formattedPhone = phone.startsWith('0') ? `+27${phone.substring(1)}` : `+${phone}`;
    }

    // Create auth credentials
    const username = process.env.BULKSMS_USERNAME;
    const apiKey = process.env.BULKSMS_API_KEY;
    const auth = Buffer.from(`${username}:${apiKey}`).toString('base64');

    // Prepare message
    const message = {
      messages: [
        {
          source: process.env.BULKSMS_FROM || 'Sayina',
          destination: formattedPhone,
          body: `Your Sayina verification code is ${otp}. Valid for ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.`
        }
      ]
    };

    // Send SMS
    const response = await axios.post(
      `${process.env.BULKSMS_API_URL}/messages`,
      message,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      data: response.data,
      message: 'OTP sent successfully via SMS'
    };
  } catch (error) {
    console.error('Error sending SMS OTP:', error.response?.data || error.message);
    
    return {
      success: false,
      error: error.response?.data || error.message,
      message: 'Failed to send OTP via SMS'
    };
  }
};

/**
 * Build the OTP email HTML body (shared between Resend and nodemailer)
 */
const buildOTPEmailHTML = (otp, firstName) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #3B82F6;">Sayina E-Signature Service</h2>
    </div>
    <p>Hello ${firstName || 'there'},</p>
    <p>Your verification code for Sayina is:</p>
    <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 5px;">
      ${otp}
    </div>
    <p>This code is valid for ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.</p>
    <p>If you didn't request this code, please ignore this email.</p>
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666;">
      <p>This is an automated message, please do not reply to this email.</p>
      <p>&copy; ${new Date().getFullYear()} Sayina. All rights reserved.</p>
    </div>
  </div>
`;

/**
 * Send OTP via email.
 * Uses Resend HTTP API when RESEND_API_KEY is set (works on Railway — pure HTTPS).
 * Falls back to nodemailer SMTP for local development.
 * @param {string} email - Email to send OTP to
 * @param {string} otp - OTP to send
 * @param {string} firstName - Recipient first name (optional)
 * @returns {Promise<object>} - Response from email sending
 */
const sendEmailOTP = async (email, otp, firstName = '') => {
  const html = buildOTPEmailHTML(otp, firstName);

  // ── Resend HTTP API (Railway production) ───────────────────────────────────
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await axios.post(
        'https://api.resend.com/emails',
        {
          from: process.env.EMAIL_FROM || 'Sayina <onboarding@resend.dev>',
          to: [email],
          subject: 'Sayina Verification Code',
          html
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'OTP sent successfully via email (Resend)'
      };
    } catch (error) {
      console.error('Error sending email OTP via Resend:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Failed to send OTP via email (Resend)'
      };
    }
  }

  // ── Nodemailer SMTP fallback (local dev) ────────────────────────────────────
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Sayina Verification Code',
      html
    });

    return {
      success: true,
      data: info,
      message: 'OTP sent successfully via email (SMTP)'
    };
  } catch (error) {
    console.error('Error sending email OTP via SMTP:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to send OTP via email (SMTP)'
    };
  }
};

/**
 * Generate and store OTP for a user
 * @param {string} userId - User ID or identifier
 * @param {string} method - Method to send OTP (sms, email)
 * @param {string} destination - Phone number or email to send OTP to
 * @returns {Promise<object>} - Response with OTP status
 */
const generateAndStoreOTP = async (userId, method, destination) => {
  try {
    // Generate OTP
    const otpLength = parseInt(process.env.OTP_LENGTH || 6);
    const otp = generateOTP(otpLength);
    
    // Create OTP key
    const otpKey = `${userId}:${method}:${destination}`;
    
    // Store OTP in Redis
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || 10);
    await storeOTP(otpKey, otp, expiryMinutes);
    
    // Get user details if needed for email
    let firstName = '';
    if (method === 'email') {
      const user = await db('users').where({ id: userId }).select('first_name').first();
      if (user) {
        firstName = user.first_name;
      }
    }
    
    // Send OTP based on method
    let sendResult;
    if (method === 'sms') {
      sendResult = await sendSMSOTP(destination, otp);
      
      // Log SMS usage if successful
      if (sendResult.success) {
        const user = await db('users').where({ id: userId }).select('org_id').first();
        if (user && user.org_id) {
          // Deduct SMS credit
          await db('organizations')
            .where({ id: user.org_id })
            .decrement('sms_credits', 1);
            
          // Log SMS usage
          await db('sms_logs').insert({
            org_id: user.org_id,
            count: 1,
            action: 'otp_sent',
            metadata: JSON.stringify({
              user_id: userId,
              method: 'sms',
              destination: destination.replace(/\d(?=\d{4})/g, '*') // Mask phone number
            })
          });
        }
      }
    } else if (method === 'email') {
      sendResult = await sendEmailOTP(destination, otp, firstName);
    } else {
      return {
        success: false,
        message: 'Invalid OTP method'
      };
    }
    
    // Return result
    if (sendResult.success) {
      return {
        success: true,
        message: `OTP sent successfully via ${method}`,
        expiresIn: expiryMinutes * 60 // in seconds
      };
    } else {
      return {
        success: false,
        message: sendResult.message,
        error: sendResult.error
      };
    }
  } catch (error) {
    console.error('Error generating and storing OTP:', error);
    
    return {
      success: false,
      message: 'Failed to generate and send OTP',
      error: error.message
    };
  }
};

/**
 * Verify OTP for a user
 * @param {string} userId - User ID or identifier
 * @param {string} method - Method used to send OTP (sms, email)
 * @param {string} destination - Phone number or email OTP was sent to
 * @param {string} otp - OTP to verify
 * @returns {Promise<object>} - Response with verification status
 */
const verifyUserOTP = async (userId, method, destination, otp) => {
  try {
    // Create OTP key
    const otpKey = `${userId}:${method}:${destination}`;
    
    // Verify OTP
    const isValid = await verifyOTP(otpKey, otp);
    
    if (isValid) {
      return {
        success: true,
        message: 'OTP verified successfully'
      };
    } else {
      return {
        success: false,
        message: 'Invalid or expired OTP'
      };
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    
    return {
      success: false,
      message: 'Failed to verify OTP',
      error: error.message
    };
  }
};

/**
 * Generate and store OTP for signing
 * @param {string} signerId - Signer ID
 * @param {string} envelopeId - Envelope ID
 * @param {string} method - Method to send OTP (sms, email)
 * @param {string} destination - Phone number or email to send OTP to
 * @returns {Promise<object>} - Response with OTP status
 */
const generateSigningOTP = async (signerId, envelopeId, method, destination) => {
  try {
    // Generate OTP
    const otpLength = parseInt(process.env.OTP_LENGTH || 6);
    const otp = generateOTP(otpLength);
    
    // Create OTP key
    const otpKey = `signing:${signerId}:${envelopeId}`;
    
    // Store OTP in Redis
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || 10);
    await storeOTP(otpKey, otp, expiryMinutes);
    
    // Get signer details
    const signer = await db('signers')
      .where({ id: signerId })
      .select('first_name', 'last_name', 'email')
      .first();
      
    // Get envelope details for organization ID
    const envelope = await db('envelopes')
      .where({ id: envelopeId })
      .select('org_id')
      .first();
    
    // Send OTP based on method
    let sendResult;
    if (method === 'sms') {
      sendResult = await sendSMSOTP(destination, otp);
      
      // Log SMS usage if successful
      if (sendResult.success && envelope) {
        // Deduct SMS credit
        await db('organizations')
          .where({ id: envelope.org_id })
          .decrement('sms_credits', 1);
          
        // Log SMS usage
        await db('sms_logs').insert({
          org_id: envelope.org_id,
          envelope_id: envelopeId,
          count: 1,
          action: 'signing_otp_sent',
          metadata: JSON.stringify({
            signer_id: signerId,
            method: 'sms',
            destination: destination.replace(/\d(?=\d{4})/g, '*') // Mask phone number
          })
        });
      }
    } else if (method === 'email') {
      sendResult = await sendEmailOTP(destination, otp, signer?.first_name || '');
    } else {
      return {
        success: false,
        message: 'Invalid OTP method'
      };
    }
    
    // Log event
    if (sendResult.success) {
      await db('events').insert({
        envelope_id: envelopeId,
        action: 'signing_otp_sent',
        metadata: JSON.stringify({
          signer_id: signerId,
          signer_email: signer?.email,
          signer_name: `${signer?.first_name || ''} ${signer?.last_name || ''}`.trim(),
          method
        })
      });
    }
    
    // Return result
    if (sendResult.success) {
      return {
        success: true,
        message: `OTP sent successfully via ${method}`,
        expiresIn: expiryMinutes * 60 // in seconds
      };
    } else {
      return {
        success: false,
        message: sendResult.message,
        error: sendResult.error
      };
    }
  } catch (error) {
    console.error('Error generating signing OTP:', error);
    
    return {
      success: false,
      message: 'Failed to generate and send signing OTP',
      error: error.message
    };
  }
};

/**
 * Verify signing OTP
 * @param {string} signerId - Signer ID
 * @param {string} envelopeId - Envelope ID
 * @param {string} otp - OTP to verify
 * @returns {Promise<object>} - Response with verification status
 */
const verifySigningOTP = async (signerId, envelopeId, otp) => {
  try {
    // Create OTP key
    const otpKey = `signing:${signerId}:${envelopeId}`;
    
    // Verify OTP
    const isValid = await verifyOTP(otpKey, otp);
    
    // Log event
    await db('events').insert({
      envelope_id: envelopeId,
      action: isValid ? 'signing_otp_verified' : 'signing_otp_failed',
      metadata: JSON.stringify({
        signer_id: signerId
      })
    });
    
    if (isValid) {
      return {
        success: true,
        message: 'OTP verified successfully'
      };
    } else {
      return {
        success: false,
        message: 'Invalid or expired OTP'
      };
    }
  } catch (error) {
    console.error('Error verifying signing OTP:', error);
    
    return {
      success: false,
      message: 'Failed to verify signing OTP',
      error: error.message
    };
  }
};

module.exports = {
  generateOTP,
  sendSMSOTP,
  sendEmailOTP,
  generateAndStoreOTP,
  verifyUserOTP,
  generateSigningOTP,
  verifySigningOTP
};
