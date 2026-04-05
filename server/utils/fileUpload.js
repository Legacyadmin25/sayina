const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { ApiError } = require('../middleware/errorMiddleware');

// Create upload directories if they don't exist
const createUploadDirectories = () => {
  const directories = [
    path.join(__dirname, '../../uploads'),
    path.join(__dirname, '../../uploads/documents'),
    path.join(__dirname, '../../uploads/logos'),
    path.join(__dirname, '../../uploads/signatures'),
    path.join(__dirname, '../../uploads/temp'),
    path.join(__dirname, '../../uploads/signed'),
    path.join(__dirname, '../../uploads/audit')
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Create directories on module load
createUploadDirectories();

/**
 * Configure document storage
 */
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/documents');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `document-${uniqueSuffix}${ext}`);
  }
});

/**
 * Configure logo storage
 */
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/logos');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `logo-${uniqueSuffix}${ext}`);
  }
});

/**
 * Configure signature storage
 */
const signatureStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/signatures');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `signature-${uniqueSuffix}${ext}`);
  }
});

/**
 * Configure temporary storage
 */
const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/temp');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `temp-${uniqueSuffix}${ext}`);
  }
});

/**
 * File filter for documents (PDF only)
 */
const documentFilter = (req, file, cb) => {
  const allowedMimeTypes = ['application/pdf'];
  const allowedExtensions = ['.pdf'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only PDF files are allowed'), false);
  }
};

/**
 * File filter for images (JPEG, PNG, GIF)
 */
const imageFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only JPEG, PNG, and GIF images are allowed'), false);
  }
};

/**
 * Multer configuration for document uploads
 */
const documentUpload = multer({
  storage: documentStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: documentFilter
});

/**
 * Multer configuration for logo uploads
 */
const logoUpload = multer({
  storage: logoStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  },
  fileFilter: imageFilter
});

/**
 * Multer configuration for signature uploads
 */
const signatureUpload = multer({
  storage: signatureStorage,
  limits: {
    fileSize: 1 * 1024 * 1024 // 1MB
  },
  fileFilter: imageFilter
});

/**
 * Multer configuration for temporary uploads
 */
const tempUpload = multer({
  storage: tempStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

/**
 * Clean up temporary files older than a specified time
 * @param {number} maxAgeMinutes - Maximum age in minutes
 */
const cleanupTempFiles = (maxAgeMinutes = 60) => {
  const tempDir = path.join(__dirname, '../../uploads/temp');
  
  if (!fs.existsSync(tempDir)) {
    return;
  }
  
  const files = fs.readdirSync(tempDir);
  const now = Date.now();
  const maxAgeMs = maxAgeMinutes * 60 * 1000;
  
  files.forEach(file => {
    const filePath = path.join(tempDir, file);
    const stats = fs.statSync(filePath);
    const fileAgeMs = now - stats.mtimeMs;
    
    if (fileAgeMs > maxAgeMs) {
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted temporary file: ${file}`);
      } catch (error) {
        console.error(`Error deleting temporary file ${file}:`, error);
      }
    }
  });
};

// Schedule cleanup to run every hour
setInterval(() => {
  cleanupTempFiles();
}, 60 * 60 * 1000);

module.exports = {
  documentUpload,
  logoUpload,
  signatureUpload,
  tempUpload,
  cleanupTempFiles
};
