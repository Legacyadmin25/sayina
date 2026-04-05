const express = require('express');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const certificateController = require('../controllers/certificateController');

const router = express.Router();

/**
 * @route   POST /api/v1/certificates
 * @desc    Generate a new digital certificate for a user
 * @access  Private
 */
router.post(
  '/',
  protect,
  verifiedEmail,
  certificateController.createUserCertificate
);

/**
 * @route   GET /api/v1/certificates/user
 * @desc    Get user certificates
 * @access  Private
 */
router.get(
  '/user',
  protect,
  certificateController.getCurrentUserCertificates
);

/**
 * @route   GET /api/v1/certificates/organization
 * @desc    Get organization certificates
 * @access  Private
 */
router.get(
  '/organization',
  protect,
  certificateController.getOrgCertificates
);

/**
 * @route   GET /api/v1/certificates/:id
 * @desc    Get certificate details
 * @access  Private
 */
router.get(
  '/:id',
  protect,
  certificateController.getCertificateDetails
);

/**
 * @route   POST /api/v1/certificates/:id/revoke
 * @desc    Revoke certificate
 * @access  Private
 */
router.post(
  '/:id/revoke',
  protect,
  verifiedEmail,
  certificateController.revokeCertificateById
);

/**
 * @route   GET /api/v1/certificates/:id/verify
 * @desc    Verify certificate
 * @access  Private
 */
router.get(
  '/:id/verify',
  protect,
  certificateController.verifyCertificateById
);

/**
 * @route   POST /api/v1/certificates/:id/sign
 * @desc    Sign data with certificate
 * @access  Private
 */
router.post(
  '/:id/sign',
  protect,
  verifiedEmail,
  certificateController.signData
);

/**
 * @route   POST /api/v1/certificates/verify-signature
 * @desc    Verify signature
 * @access  Private
 */
router.post(
  '/verify-signature',
  protect,
  certificateController.verifyDataSignature
);

module.exports = router;
