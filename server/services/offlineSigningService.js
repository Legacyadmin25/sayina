/**
 * Offline Signing Service
 * 
 * This service provides offline signing capabilities for the Sayina E-Signature platform,
 * allowing users to sign documents without an active internet connection.
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { db } = require('../config/db');
const { logSystemEvent } = require('./loggerService');

/**
 * Generate offline signing package
 * @param {string} envelopeId - Envelope ID
 * @param {string} userId - User ID
 * @param {Object} options - Package options
 * @returns {Promise<Object>} - Offline signing package details
 */
const generateOfflinePackage = async (envelopeId, userId, options = {}) => {
  try {
    const {
      expiration_hours = 72, // Default 3 days
      include_attachments = true
    } = options;
    
    // Get envelope
    const envelope = await db('envelopes')
      .where('id', envelopeId)
      .first();
    
    if (!envelope) {
      throw new Error('Envelope not found');
    }
    
    // Check if user is a signer for this envelope
    const signer = await db('envelope_signers')
      .where('envelope_id', envelopeId)
      .where('user_id', userId)
      .first();
    
    if (!signer) {
      throw new Error('User is not a signer for this envelope');
    }
    
    // Get documents
    const documents = await db('envelope_documents')
      .where('envelope_id', envelopeId)
      .orderBy('order');
    
    if (documents.length === 0) {
      throw new Error('No documents found in envelope');
    }
    
    // Get fields for signer
    const fields = await db('document_fields')
      .whereIn('document_id', documents.map(doc => doc.id))
      .where('assigned_to', signer.id)
      .orderBy('document_id')
      .orderBy('page')
      .orderBy('position_y')
      .orderBy('position_x');
    
    // Generate package ID and security code
    const packageId = uuidv4();
    const securityCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    
    // Calculate expiration date
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + expiration_hours);
    
    // Create package directory
    const packagesDir = path.join(__dirname, '..', 'uploads', 'offline_packages');
    if (!fs.existsSync(packagesDir)) {
      fs.mkdirSync(packagesDir, { recursive: true });
    }
    
    const packageDir = path.join(packagesDir, packageId);
    fs.mkdirSync(packageDir);
    
    // Copy documents to package directory
    const packageDocuments = [];
    for (const document of documents) {
      const documentPath = path.join(__dirname, '..', document.file_path);
      const packageDocPath = path.join(packageDir, path.basename(document.file_path));
      
      fs.copyFileSync(documentPath, packageDocPath);
      
      packageDocuments.push({
        id: document.id,
        name: document.name,
        file_path: path.basename(document.file_path),
        page_count: document.page_count
      });
    }
    
    // Include attachments if requested
    let packageAttachments = [];
    if (include_attachments) {
      const attachments = await db('envelope_attachments')
        .where('envelope_id', envelopeId);
      
      for (const attachment of attachments) {
        const attachmentPath = path.join(__dirname, '..', attachment.file_path);
        const packageAttachPath = path.join(packageDir, 'attachments', path.basename(attachment.file_path));
        
        // Create attachments directory if it doesn't exist
        const attachmentsDir = path.join(packageDir, 'attachments');
        if (!fs.existsSync(attachmentsDir)) {
          fs.mkdirSync(attachmentsDir);
        }
        
        fs.copyFileSync(attachmentPath, packageAttachPath);
        
        packageAttachments.push({
          id: attachment.id,
          name: attachment.name,
          file_path: path.join('attachments', path.basename(attachment.file_path))
        });
      }
    }
    
    // Create package manifest
    const manifest = {
      package_id: packageId,
      envelope_id: envelopeId,
      envelope_name: envelope.name,
      signer_id: signer.id,
      signer_name: `${signer.first_name} ${signer.last_name}`,
      signer_email: signer.email,
      created_at: new Date().toISOString(),
      expires_at: expirationDate.toISOString(),
      documents: packageDocuments,
      attachments: packageAttachments,
      fields: fields.map(field => ({
        id: field.id,
        document_id: field.document_id,
        type: field.type,
        page: field.page,
        position_x: field.position_x,
        position_y: field.position_y,
        width: field.width,
        height: field.height,
        required: field.required,
        label: field.label,
        properties: JSON.parse(field.properties || '{}')
      }))
    };
    
    // Write manifest to package directory
    fs.writeFileSync(
      path.join(packageDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
    
    // Create package zip file
    // In a real implementation, this would use a library like archiver to create a zip file
    
    // Store package in database
    await db('offline_signing_packages').insert({
      id: packageId,
      envelope_id: envelopeId,
      signer_id: signer.id,
      security_code: securityCode,
      status: 'created',
      expires_at: expirationDate,
      created_at: db.fn.now()
    });
    
    return {
      package_id: packageId,
      security_code: securityCode,
      envelope_id: envelopeId,
      signer_id: signer.id,
      expires_at: expirationDate,
      download_url: `/api/v1/offline/packages/${packageId}/download`,
      documents_count: documents.length,
      fields_count: fields.length,
      attachments_count: packageAttachments.length
    };
  } catch (error) {
    console.error('Error generating offline package:', error);
    throw error;
  }
};

/**
 * Process offline signed package
 * @param {string} packageId - Package ID
 * @param {string} securityCode - Security code
 * @param {Object} signedData - Signed data
 * @returns {Promise<Object>} - Processing result
 */
const processSignedPackage = async (packageId, securityCode, signedData) => {
  try {
    // Get package
    const pkg = await db('offline_signing_packages')
      .where('id', packageId)
      .where('security_code', securityCode)
      .first();
    
    if (!pkg) {
      throw new Error('Invalid package ID or security code');
    }
    
    // Check if package is expired
    if (new Date(pkg.expires_at) < new Date()) {
      throw new Error('Package has expired');
    }
    
    // Check if package has already been processed
    if (pkg.status === 'completed') {
      throw new Error('Package has already been processed');
    }
    
    // Validate signed data
    if (!signedData.fields || !Array.isArray(signedData.fields)) {
      throw new Error('Invalid signed data format');
    }
    
    // Process each signed field
    for (const field of signedData.fields) {
      // Validate field data
      if (!field.id || !field.value) {
        continue;
      }
      
      // Update field value in database
      await db('document_field_values').insert({
        id: uuidv4(),
        field_id: field.id,
        value: field.value,
        signed_at: db.fn.now(),
        signed_offline: true
      });
    }
    
    // Update package status
    await db('offline_signing_packages')
      .where('id', packageId)
      .update({
        status: 'completed',
        completed_at: db.fn.now()
      });
    
    // Update envelope signer status
    await db('envelope_signers')
      .where('id', pkg.signer_id)
      .update({
        status: 'completed',
        completed_at: db.fn.now()
      });
    
    // Check if all signers have completed
    const allSignersCompleted = await checkAllSignersCompleted(pkg.envelope_id);
    
    // If all signers have completed, update envelope status
    if (allSignersCompleted) {
      await db('envelopes')
        .where('id', pkg.envelope_id)
        .update({
          status: 'completed',
          completed_at: db.fn.now()
        });
    }
    
    return {
      success: true,
      message: 'Offline signed package processed successfully',
      envelope_id: pkg.envelope_id,
      all_completed: allSignersCompleted
    };
  } catch (error) {
    console.error('Error processing signed package:', error);
    throw error;
  }
};

/**
 * Check if all signers have completed
 * @param {string} envelopeId - Envelope ID
 * @returns {Promise<boolean>} - All completed status
 */
const checkAllSignersCompleted = async (envelopeId) => {
  try {
    // Get all signers for envelope
    const signers = await db('envelope_signers')
      .where('envelope_id', envelopeId);
    
    // Check if all signers have completed
    return signers.every(signer => signer.status === 'completed');
  } catch (error) {
    console.error('Error checking signers completion:', error);
    throw error;
  }
};

/**
 * Get offline package
 * @param {string} packageId - Package ID
 * @returns {Promise<Object>} - Package details
 */
const getOfflinePackage = async (packageId) => {
  try {
    // Get package
    const pkg = await db('offline_signing_packages')
      .where('id', packageId)
      .first();
    
    if (!pkg) {
      throw new Error('Package not found');
    }
    
    // Get envelope
    const envelope = await db('envelopes')
      .where('id', pkg.envelope_id)
      .first();
    
    // Get signer
    const signer = await db('envelope_signers')
      .where('id', pkg.signer_id)
      .first();
    
    return {
      id: pkg.id,
      envelope_id: pkg.envelope_id,
      envelope_name: envelope.name,
      signer_id: pkg.signer_id,
      signer_name: `${signer.first_name} ${signer.last_name}`,
      signer_email: signer.email,
      status: pkg.status,
      created_at: pkg.created_at,
      expires_at: pkg.expires_at,
      completed_at: pkg.completed_at
    };
  } catch (error) {
    console.error('Error getting offline package:', error);
    throw error;
  }
};

/**
 * Get user's offline packages
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Packages
 */
const getUserOfflinePackages = async (userId, options = {}) => {
  try {
    const {
      status,
      limit = 20,
      offset = 0
    } = options;
    
    // Get signers for user
    const signers = await db('envelope_signers')
      .where('user_id', userId)
      .select('id');
    
    if (signers.length === 0) {
      return [];
    }
    
    // Build query
    let query = db('offline_signing_packages')
      .whereIn('signer_id', signers.map(s => s.id))
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    // Apply status filter
    if (status) {
      query = query.where('status', status);
    }
    
    // Get packages
    const packages = await query;
    
    // Get envelope details for each package
    const result = [];
    for (const pkg of packages) {
      const envelope = await db('envelopes')
        .where('id', pkg.envelope_id)
        .first();
      
      const signer = await db('envelope_signers')
        .where('id', pkg.signer_id)
        .first();
      
      result.push({
        id: pkg.id,
        envelope_id: pkg.envelope_id,
        envelope_name: envelope.name,
        signer_id: pkg.signer_id,
        signer_name: `${signer.first_name} ${signer.last_name}`,
        signer_email: signer.email,
        status: pkg.status,
        created_at: pkg.created_at,
        expires_at: pkg.expires_at,
        completed_at: pkg.completed_at
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error getting user offline packages:', error);
    throw error;
  }
};

/**
 * Generate offline signing instructions
 * @param {string} packageId - Package ID
 * @returns {Promise<Buffer>} - PDF instructions
 */
const generateOfflineInstructions = async (packageId) => {
  try {
    // Get package
    const pkg = await db('offline_signing_packages')
      .where('id', packageId)
      .first();
    
    if (!pkg) {
      throw new Error('Package not found');
    }
    
    // Get envelope
    const envelope = await db('envelopes')
      .where('id', pkg.envelope_id)
      .first();
    
    // Get signer
    const signer = await db('envelope_signers')
      .where('id', pkg.signer_id)
      .first();
    
    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // US Letter size
    
    // Add content to PDF
    // In a real implementation, this would use pdf-lib to add text, images, etc.
    
    // Save PDF
    const pdfBytes = await pdfDoc.save();
    
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('Error generating offline instructions:', error);
    throw error;
  }
};

/**
 * Validate offline signing package
 * @param {string} packageId - Package ID
 * @param {string} securityCode - Security code
 * @returns {Promise<boolean>} - Validation result
 */
const validateOfflinePackage = async (packageId, securityCode) => {
  try {
    // Get package
    const pkg = await db('offline_signing_packages')
      .where('id', packageId)
      .where('security_code', securityCode)
      .first();
    
    if (!pkg) {
      return false;
    }
    
    // Check if package is expired
    if (new Date(pkg.expires_at) < new Date()) {
      return false;
    }
    
    // Check if package has already been processed
    if (pkg.status === 'completed') {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error validating offline package:', error);
    throw error;
  }
};

module.exports = {
  generateOfflinePackage,
  processSignedPackage,
  getOfflinePackage,
  getUserOfflinePackages,
  generateOfflineInstructions,
  validateOfflinePackage
};
