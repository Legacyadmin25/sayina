/**
 * Document Security Service
 * 
 * This service provides functionality for enhancing document security in the Sayina E-Signature platform,
 * including password protection, watermarking, and secure viewing options.
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const crypto = require('crypto');
const db = require('../config/db');
const { logSystemEvent } = require('./loggerService');

/**
 * Apply password protection to a document
 * @param {string} documentId - Document ID
 * @param {Object} securityOptions - Security options
 * @returns {Promise<string>} - Path to secured document
 */
const applyPasswordProtection = async (documentId, securityOptions) => {
  try {
    // Get document
    const document = await db('documents')
      .where('id', documentId)
      .first();
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Read document file
    const fileBuffer = fs.readFileSync(document.file_path);
    
    // Load PDF
    const pdfDoc = await PDFDocument.load(fileBuffer);
    
    // Apply password protection
    const { ownerPassword, userPassword, permissions } = securityOptions;
    
    // Set permissions
    const permissionOptions = {
      printing: permissions?.printing !== false,
      modifying: permissions?.modifying !== false,
      copying: permissions?.copying !== false,
      annotating: permissions?.annotating !== false,
      fillingForms: permissions?.fillingForms !== false,
      contentAccessibility: permissions?.contentAccessibility !== false,
      documentAssembly: permissions?.documentAssembly !== false
    };
    
    // Encrypt document
    pdfDoc.encrypt({
      ownerPassword: ownerPassword,
      userPassword: userPassword,
      ...permissionOptions
    });
    
    // Save encrypted PDF
    const pdfBytes = await pdfDoc.save();
    
    // Create secured document directory if it doesn't exist
    const securedDir = path.join(__dirname, '..', 'uploads', 'secured_documents');
    if (!fs.existsSync(securedDir)) {
      fs.mkdirSync(securedDir, { recursive: true });
    }
    
    // Save secured document
    const securedFileName = `${documentId}_secured_${Date.now()}.pdf`;
    const securedFilePath = path.join(securedDir, securedFileName);
    fs.writeFileSync(securedFilePath, pdfBytes);
    
    // Create security record
    const securityId = uuidv4();
    await db('document_security').insert({
      id: securityId,
      document_id: documentId,
      org_id: document.org_id,
      security_type: 'password_protection',
      settings: JSON.stringify({
        has_owner_password: !!ownerPassword,
        has_user_password: !!userPassword,
        permissions: permissionOptions
      }),
      secured_file_path: securedFilePath,
      created_at: db.fn.now()
    });
    
    // Update document
    await db('documents')
      .where('id', documentId)
      .update({
        is_secured: true,
        updated_at: db.fn.now()
      });
    
    return securedFilePath;
  } catch (error) {
    console.error('Error applying password protection:', error);
    throw error;
  }
};

/**
 * Apply watermark to a document
 * @param {string} documentId - Document ID
 * @param {Object} watermarkOptions - Watermark options
 * @returns {Promise<string>} - Path to watermarked document
 */
const applyWatermark = async (documentId, watermarkOptions) => {
  try {
    // Get document
    const document = await db('documents')
      .where('id', documentId)
      .first();
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Read document file
    const fileBuffer = fs.readFileSync(document.file_path);
    
    // Load PDF
    const pdfDoc = await PDFDocument.load(fileBuffer);
    
    // Get watermark options
    const {
      text,
      opacity = 0.3,
      color = '#888888',
      fontSize = 50,
      rotation = -45,
      position = 'center'
    } = watermarkOptions;
    
    // Parse color
    const colorHex = color.replace('#', '');
    const r = parseInt(colorHex.substr(0, 2), 16) / 255;
    const g = parseInt(colorHex.substr(2, 2), 16) / 255;
    const b = parseInt(colorHex.substr(4, 2), 16) / 255;
    
    // Load font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Apply watermark to each page
    const pages = pdfDoc.getPages();
    
    for (const page of pages) {
      const { width, height } = page.getSize();
      
      // Calculate position
      let x, y;
      
      switch (position) {
        case 'top-left':
          x = 50;
          y = height - 50;
          break;
        case 'top-right':
          x = width - 50;
          y = height - 50;
          break;
        case 'bottom-left':
          x = 50;
          y = 50;
          break;
        case 'bottom-right':
          x = width - 50;
          y = 50;
          break;
        case 'center':
        default:
          x = width / 2;
          y = height / 2;
          break;
      }
      
      // Draw watermark
      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(r, g, b),
        opacity,
        rotate: (rotation * Math.PI) / 180,
        xSkew: 0,
        ySkew: 0
      });
    }
    
    // Save watermarked PDF
    const pdfBytes = await pdfDoc.save();
    
    // Create watermarked document directory if it doesn't exist
    const watermarkedDir = path.join(__dirname, '..', 'uploads', 'watermarked_documents');
    if (!fs.existsSync(watermarkedDir)) {
      fs.mkdirSync(watermarkedDir, { recursive: true });
    }
    
    // Save watermarked document
    const watermarkedFileName = `${documentId}_watermarked_${Date.now()}.pdf`;
    const watermarkedFilePath = path.join(watermarkedDir, watermarkedFileName);
    fs.writeFileSync(watermarkedFilePath, pdfBytes);
    
    // Create security record
    const securityId = uuidv4();
    await db('document_security').insert({
      id: securityId,
      document_id: documentId,
      org_id: document.org_id,
      security_type: 'watermark',
      settings: JSON.stringify(watermarkOptions),
      secured_file_path: watermarkedFilePath,
      created_at: db.fn.now()
    });
    
    // Update document
    await db('documents')
      .where('id', documentId)
      .update({
        is_secured: true,
        updated_at: db.fn.now()
      });
    
    return watermarkedFilePath;
  } catch (error) {
    console.error('Error applying watermark:', error);
    throw error;
  }
};

/**
 * Generate secure viewing link
 * @param {string} documentId - Document ID
 * @param {Object} options - Secure viewing options
 * @returns {Promise<Object>} - Secure viewing details
 */
const generateSecureViewingLink = async (documentId, options = {}) => {
  try {
    // Get document
    const document = await db('documents')
      .where('id', documentId)
      .first();
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    const {
      expiresIn = 24, // hours
      allowDownload = false,
      allowPrint = false,
      requireAuthentication = true,
      watermarkText
    } = options;
    
    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresIn);
    
    // Create secure viewing record
    const linkId = uuidv4();
    await db('secure_viewing_links').insert({
      id: linkId,
      document_id: documentId,
      org_id: document.org_id,
      token,
      expires_at: expiresAt,
      allow_download: allowDownload,
      allow_print: allowPrint,
      require_authentication: requireAuthentication,
      watermark_text: watermarkText || null,
      created_at: db.fn.now()
    });
    
    // Generate link
    const baseUrl = process.env.BASE_URL || 'https://sayina.co.za';
    const secureLink = `${baseUrl}/secure-view/${token}`;
    
    return {
      id: linkId,
      token,
      secure_link: secureLink,
      expires_at: expiresAt,
      settings: {
        allow_download: allowDownload,
        allow_print: allowPrint,
        require_authentication: requireAuthentication,
        watermark_text: watermarkText
      }
    };
  } catch (error) {
    console.error('Error generating secure viewing link:', error);
    throw error;
  }
};

/**
 * Validate secure viewing token
 * @param {string} token - Secure viewing token
 * @returns {Promise<Object>} - Secure viewing details
 */
const validateSecureViewingToken = async (token) => {
  try {
    // Get secure viewing link
    const link = await db('secure_viewing_links')
      .where('token', token)
      .first();
    
    if (!link) {
      throw new Error('Invalid secure viewing token');
    }
    
    // Check if expired
    const now = new Date();
    const expiresAt = new Date(link.expires_at);
    
    if (now > expiresAt) {
      throw new Error('Secure viewing link has expired');
    }
    
    // Get document
    const document = await db('documents')
      .where('id', link.document_id)
      .first();
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Track viewing
    await db('secure_viewing_access').insert({
      id: uuidv4(),
      link_id: link.id,
      document_id: link.document_id,
      org_id: link.org_id,
      accessed_at: db.fn.now()
    });
    
    return {
      document_id: document.id,
      document_name: document.name,
      file_path: document.file_path,
      settings: {
        allow_download: link.allow_download,
        allow_print: link.allow_print,
        require_authentication: link.require_authentication,
        watermark_text: link.watermark_text
      }
    };
  } catch (error) {
    console.error('Error validating secure viewing token:', error);
    throw error;
  }
};

/**
 * Get document security settings
 * @param {string} documentId - Document ID
 * @returns {Promise<Array>} - Security settings
 */
const getDocumentSecuritySettings = async (documentId) => {
  try {
    // Get security records
    const securityRecords = await db('document_security')
      .where('document_id', documentId)
      .orderBy('created_at', 'desc');
    
    // Format records
    return securityRecords.map(record => ({
      id: record.id,
      document_id: record.document_id,
      security_type: record.security_type,
      settings: JSON.parse(record.settings),
      created_at: record.created_at
    }));
  } catch (error) {
    console.error('Error getting document security settings:', error);
    throw error;
  }
};

/**
 * Get secure viewing links
 * @param {string} documentId - Document ID
 * @returns {Promise<Array>} - Secure viewing links
 */
const getSecureViewingLinks = async (documentId) => {
  try {
    // Get links
    const links = await db('secure_viewing_links')
      .where('document_id', documentId)
      .orderBy('created_at', 'desc');
    
    // Generate base URL
    const baseUrl = process.env.BASE_URL || 'https://sayina.co.za';
    
    // Format links
    return links.map(link => ({
      id: link.id,
      document_id: link.document_id,
      token: link.token,
      secure_link: `${baseUrl}/secure-view/${link.token}`,
      expires_at: link.expires_at,
      settings: {
        allow_download: link.allow_download,
        allow_print: link.allow_print,
        require_authentication: link.require_authentication,
        watermark_text: link.watermark_text
      },
      created_at: link.created_at
    }));
  } catch (error) {
    console.error('Error getting secure viewing links:', error);
    throw error;
  }
};

/**
 * Revoke secure viewing link
 * @param {string} linkId - Secure viewing link ID
 * @returns {Promise<boolean>} - Success status
 */
const revokeSecureViewingLink = async (linkId) => {
  try {
    // Delete link
    await db('secure_viewing_links')
      .where('id', linkId)
      .delete();
    
    return true;
  } catch (error) {
    console.error('Error revoking secure viewing link:', error);
    throw error;
  }
};

/**
 * Get secure viewing access logs
 * @param {string} documentId - Document ID
 * @returns {Promise<Array>} - Access logs
 */
const getSecureViewingAccessLogs = async (documentId) => {
  try {
    // Get access logs
    const logs = await db('secure_viewing_access')
      .where('document_id', documentId)
      .orderBy('accessed_at', 'desc');
    
    // Get link IDs
    const linkIds = [...new Set(logs.map(log => log.link_id))];
    
    // Get links
    const links = await db('secure_viewing_links')
      .whereIn('id', linkIds)
      .select('id', 'token');
    
    // Create link lookup
    const linkLookup = {};
    links.forEach(link => {
      linkLookup[link.id] = link.token;
    });
    
    // Format logs
    return logs.map(log => ({
      id: log.id,
      document_id: log.document_id,
      link_id: log.link_id,
      token: linkLookup[log.link_id] || 'Unknown',
      accessed_at: log.accessed_at
    }));
  } catch (error) {
    console.error('Error getting secure viewing access logs:', error);
    throw error;
  }
};

module.exports = {
  applyPasswordProtection,
  applyWatermark,
  generateSecureViewingLink,
  validateSecureViewingToken,
  getDocumentSecuritySettings,
  getSecureViewingLinks,
  revokeSecureViewingLink,
  getSecureViewingAccessLogs
};
