/**
 * Version Control Service
 * 
 * This service manages document versioning for the Sayina E-Signature platform,
 * allowing tracking of document changes and revisions over time.
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { logSystemEvent } = require('./loggerService');

/**
 * Create a new document version
 * @param {string} documentId - Original document ID
 * @param {Object} versionData - Version data
 * @param {Object} fileData - File data
 * @returns {Promise<string>} - Version ID
 */
const createDocumentVersion = async (documentId, versionData, fileData) => {
  try {
    const {
      version_number,
      changes_description,
      created_by
    } = versionData;
    
    // Get original document
    const originalDoc = await db('documents')
      .where('id', documentId)
      .first();
    
    if (!originalDoc) {
      throw new Error('Original document not found');
    }
    
    // Create upload directory if it doesn't exist
    const uploadDir = path.join(__dirname, '..', 'uploads', 'versions');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Save file
    const fileName = `${uuidv4()}_${fileData.originalname}`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, fileData.buffer);
    
    // Get file size
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    
    // Create version record
    const versionId = uuidv4();
    await db('document_versions').insert({
      id: versionId,
      document_id: documentId,
      org_id: originalDoc.org_id,
      version_number,
      changes_description: changes_description || null,
      file_path: filePath,
      file_name: fileData.originalname,
      file_size: fileSize,
      file_type: fileData.mimetype,
      created_by,
      created_at: db.fn.now()
    });
    
    // Update document version count
    await db('documents')
      .where('id', documentId)
      .increment('version_count', 1);
    
    return versionId;
  } catch (error) {
    console.error('Error creating document version:', error);
    throw error;
  }
};

/**
 * Get document versions
 * @param {string} documentId - Document ID
 * @returns {Promise<Array>} - Document versions
 */
const getDocumentVersions = async (documentId) => {
  try {
    // Get versions
    const versions = await db('document_versions')
      .where('document_id', documentId)
      .orderBy('version_number', 'desc');
    
    // Get users
    const userIds = [...new Set(versions.map(v => v.created_by))];
    const users = await db('users')
      .whereIn('id', userIds)
      .select('id', 'first_name', 'last_name', 'email');
    
    // Create user lookup
    const userLookup = {};
    users.forEach(user => {
      userLookup[user.id] = user;
    });
    
    // Format versions
    return versions.map(version => ({
      id: version.id,
      document_id: version.document_id,
      version_number: version.version_number,
      changes_description: version.changes_description,
      file_name: version.file_name,
      file_size: version.file_size,
      file_type: version.file_type,
      created_by: userLookup[version.created_by] || { id: version.created_by },
      created_at: version.created_at
    }));
  } catch (error) {
    console.error('Error getting document versions:', error);
    throw error;
  }
};

/**
 * Get version details
 * @param {string} versionId - Version ID
 * @returns {Promise<Object>} - Version details
 */
const getVersionDetails = async (versionId) => {
  try {
    // Get version
    const version = await db('document_versions')
      .where('id', versionId)
      .first();
    
    if (!version) {
      throw new Error('Version not found');
    }
    
    // Get document
    const document = await db('documents')
      .where('id', version.document_id)
      .select('id', 'name', 'envelope_id')
      .first();
    
    // Get user
    const user = await db('users')
      .where('id', version.created_by)
      .select('id', 'first_name', 'last_name', 'email')
      .first();
    
    return {
      id: version.id,
      document,
      version_number: version.version_number,
      changes_description: version.changes_description,
      file_path: version.file_path,
      file_name: version.file_name,
      file_size: version.file_size,
      file_type: version.file_type,
      created_by: user,
      created_at: version.created_at
    };
  } catch (error) {
    console.error('Error getting version details:', error);
    throw error;
  }
};

/**
 * Restore document version
 * @param {string} versionId - Version ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Restored document
 */
const restoreDocumentVersion = async (versionId, userId) => {
  try {
    // Get version
    const version = await getVersionDetails(versionId);
    
    // Create new version from current document
    const currentDoc = await db('documents')
      .where('id', version.document.id)
      .first();
    
    // Create backup version of current state
    const backupVersionId = uuidv4();
    await db('document_versions').insert({
      id: backupVersionId,
      document_id: currentDoc.id,
      org_id: currentDoc.org_id,
      version_number: currentDoc.version_count + 1,
      changes_description: 'Automatic backup before version restore',
      file_path: currentDoc.file_path,
      file_name: currentDoc.file_name,
      file_size: currentDoc.file_size,
      file_type: currentDoc.file_type,
      created_by: userId,
      created_at: db.fn.now()
    });
    
    // Copy version file to document location
    fs.copyFileSync(version.file_path, currentDoc.file_path);
    
    // Update document
    await db('documents')
      .where('id', currentDoc.id)
      .update({
        file_name: version.file_name,
        file_size: version.file_size,
        file_type: version.file_type,
        version_count: db.raw('version_count + 1'),
        updated_at: db.fn.now()
      });
    
    // Create restore record
    const restoreId = uuidv4();
    await db('version_restores').insert({
      id: restoreId,
      document_id: currentDoc.id,
      version_id: versionId,
      backup_version_id: backupVersionId,
      restored_by: userId,
      created_at: db.fn.now()
    });
    
    return {
      document_id: currentDoc.id,
      version_id: versionId,
      backup_version_id: backupVersionId
    };
  } catch (error) {
    console.error('Error restoring document version:', error);
    throw error;
  }
};

/**
 * Delete document version
 * @param {string} versionId - Version ID
 * @returns {Promise<boolean>} - Success status
 */
const deleteDocumentVersion = async (versionId) => {
  try {
    // Get version
    const version = await db('document_versions')
      .where('id', versionId)
      .first();
    
    if (!version) {
      throw new Error('Version not found');
    }
    
    // Check if it's the only version
    const versionCount = await db('document_versions')
      .where('document_id', version.document_id)
      .count('id as count')
      .first();
    
    if (versionCount.count <= 1) {
      throw new Error('Cannot delete the only version of a document');
    }
    
    // Delete version file
    if (version.file_path && fs.existsSync(version.file_path)) {
      fs.unlinkSync(version.file_path);
    }
    
    // Delete version record
    await db('document_versions')
      .where('id', versionId)
      .delete();
    
    return true;
  } catch (error) {
    console.error('Error deleting document version:', error);
    throw error;
  }
};

/**
 * Get version restore history
 * @param {string} documentId - Document ID
 * @returns {Promise<Array>} - Restore history
 */
const getVersionRestoreHistory = async (documentId) => {
  try {
    // Get restore records
    const restores = await db('version_restores')
      .where('document_id', documentId)
      .orderBy('created_at', 'desc');
    
    // Get user IDs
    const userIds = [...new Set(restores.map(r => r.restored_by))];
    
    // Get users
    const users = await db('users')
      .whereIn('id', userIds)
      .select('id', 'first_name', 'last_name', 'email');
    
    // Create user lookup
    const userLookup = {};
    users.forEach(user => {
      userLookup[user.id] = user;
    });
    
    // Get version IDs
    const versionIds = [
      ...new Set([
        ...restores.map(r => r.version_id),
        ...restores.map(r => r.backup_version_id)
      ])
    ];
    
    // Get versions
    const versions = await db('document_versions')
      .whereIn('id', versionIds)
      .select('id', 'version_number');
    
    // Create version lookup
    const versionLookup = {};
    versions.forEach(version => {
      versionLookup[version.id] = version;
    });
    
    // Format restore records
    return restores.map(restore => ({
      id: restore.id,
      document_id: restore.document_id,
      restored_version: versionLookup[restore.version_id] 
        ? { id: restore.version_id, version_number: versionLookup[restore.version_id].version_number }
        : { id: restore.version_id },
      backup_version: versionLookup[restore.backup_version_id]
        ? { id: restore.backup_version_id, version_number: versionLookup[restore.backup_version_id].version_number }
        : { id: restore.backup_version_id },
      restored_by: userLookup[restore.restored_by] || { id: restore.restored_by },
      created_at: restore.created_at
    }));
  } catch (error) {
    console.error('Error getting version restore history:', error);
    throw error;
  }
};

/**
 * Get document version count
 * @param {string} documentId - Document ID
 * @returns {Promise<number>} - Version count
 */
const getDocumentVersionCount = async (documentId) => {
  try {
    // Get version count
    const result = await db('document_versions')
      .where('document_id', documentId)
      .count('id as count')
      .first();
    
    return result.count;
  } catch (error) {
    console.error('Error getting document version count:', error);
    throw error;
  }
};

module.exports = {
  createDocumentVersion,
  getDocumentVersions,
  getVersionDetails,
  restoreDocumentVersion,
  deleteDocumentVersion,
  getVersionRestoreHistory,
  getDocumentVersionCount
};
