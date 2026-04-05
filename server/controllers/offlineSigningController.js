/**
 * Offline Signing Controller
 * 
 * This controller handles offline signing features for the Sayina E-Signature platform,
 * allowing users to sign documents without an active internet connection.
 */

const { ApiError } = require('../middleware/errorMiddleware');
const {
  generateOfflinePackage,
  processSignedPackage,
  getOfflinePackage,
  getUserOfflinePackages,
  generateOfflineInstructions,
  validateOfflinePackage
} = require('../services/offlineSigningService');
const { logSystemEvent } = require('../services/loggerService');
const path = require('path');
const fs = require('fs');

/**
 * @desc    Generate offline signing package
 * @route   POST /api/v1/offline/packages
 * @access  Private
 */
const generateOfflinePackageHandler = async (req, res, next) => {
  try {
    const {
      envelope_id,
      expiration_hours,
      include_attachments
    } = req.body;
    
    const userId = req.user.id;
    
    // Validate required fields
    if (!envelope_id) {
      return next(new ApiError(400, 'Envelope ID is required'));
    }
    
    // Generate package
    const packageDetails = await generateOfflinePackage(envelope_id, userId, {
      expiration_hours,
      include_attachments
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'offline_package_generated',
      metadata: {
        package_id: packageDetails.package_id,
        envelope_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'Offline signing package generated successfully',
      data: packageDetails
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Process offline signed package
 * @route   POST /api/v1/offline/packages/:packageId/process
 * @access  Public
 */
const processSignedPackageHandler = async (req, res, next) => {
  try {
    const { packageId } = req.params;
    const {
      security_code,
      signed_data
    } = req.body;
    
    // Validate required fields
    if (!security_code || !signed_data) {
      return next(new ApiError(400, 'Security code and signed data are required'));
    }
    
    // Process package
    const result = await processSignedPackage(packageId, security_code, signed_data);
    
    // Log event
    await logSystemEvent({
      action: 'offline_package_processed',
      metadata: {
        package_id: packageId,
        envelope_id: result.envelope_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Offline signed package processed successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get offline package
 * @route   GET /api/v1/offline/packages/:packageId
 * @access  Private
 */
const getOfflinePackageHandler = async (req, res, next) => {
  try {
    const { packageId } = req.params;
    
    // Get package
    const packageDetails = await getOfflinePackage(packageId);
    
    res.status(200).json({
      success: true,
      data: packageDetails
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's offline packages
 * @route   GET /api/v1/offline/packages
 * @access  Private
 */
const getUserOfflinePackagesHandler = async (req, res, next) => {
  try {
    const {
      status,
      limit = 20,
      offset = 0
    } = req.query;
    
    const userId = req.user.id;
    
    // Get packages
    const packages = await getUserOfflinePackages(userId, {
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.status(200).json({
      success: true,
      count: packages.length,
      data: packages
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download offline signing package
 * @route   GET /api/v1/offline/packages/:packageId/download
 * @access  Private
 */
const downloadOfflinePackageHandler = async (req, res, next) => {
  try {
    const { packageId } = req.params;
    
    // Get package
    const packageDetails = await getOfflinePackage(packageId);
    
    // Check if package exists
    const packageDir = path.join(__dirname, '..', 'uploads', 'offline_packages', packageId);
    if (!fs.existsSync(packageDir)) {
      return next(new ApiError(404, 'Package file not found'));
    }
    
    // In a real implementation, this would create and send a zip file
    // For now, we'll just send the manifest.json file
    const manifestPath = path.join(packageDir, 'manifest.json');
    
    // Log event
    await logSystemEvent({
      user_id: req.user.id,
      action: 'offline_package_downloaded',
      metadata: {
        package_id: packageId,
        envelope_id: packageDetails.envelope_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.download(manifestPath, `offline_package_${packageId}.json`);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate offline signing instructions
 * @route   GET /api/v1/offline/packages/:packageId/instructions
 * @access  Private
 */
const generateOfflineInstructionsHandler = async (req, res, next) => {
  try {
    const { packageId } = req.params;
    
    // Generate instructions
    const pdfBuffer = await generateOfflineInstructions(packageId);
    
    // Log event
    await logSystemEvent({
      user_id: req.user.id,
      action: 'offline_instructions_generated',
      metadata: {
        package_id: packageId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=offline_instructions_${packageId}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Validate offline signing package
 * @route   POST /api/v1/offline/packages/:packageId/validate
 * @access  Public
 */
const validateOfflinePackageHandler = async (req, res, next) => {
  try {
    const { packageId } = req.params;
    const { security_code } = req.body;
    
    // Validate required fields
    if (!security_code) {
      return next(new ApiError(400, 'Security code is required'));
    }
    
    // Validate package
    const isValid = await validateOfflinePackage(packageId, security_code);
    
    res.status(200).json({
      success: true,
      data: {
        is_valid: isValid
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateOfflinePackageHandler,
  processSignedPackageHandler,
  getOfflinePackageHandler,
  getUserOfflinePackagesHandler,
  downloadOfflinePackageHandler,
  generateOfflineInstructionsHandler,
  validateOfflinePackageHandler
};
