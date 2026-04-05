const express = require('express');
const { protect, verifiedEmail } = require('../middleware/authMiddleware');
const blockchainVerificationController = require('../controllers/blockchainVerificationController');

const router = express.Router();

/**
 * Document Registration Routes
 */

/**
 * @route   POST /api/v1/blockchain/documents/:documentId/register
 * @desc    Register document on blockchain
 * @access  Private
 */
router.post(
  '/documents/:documentId/register',
  protect,
  verifiedEmail,
  blockchainVerificationController.registerDocumentOnBlockchainHandler
);

/**
 * @route   POST /api/v1/blockchain/documents/:documentId/verify
 * @desc    Verify document on blockchain
 * @access  Private
 */
router.post(
  '/documents/:documentId/verify',
  protect,
  blockchainVerificationController.verifyDocumentOnBlockchainHandler
);

/**
 * @route   GET /api/v1/blockchain/documents/:documentId/registrations
 * @desc    Get document blockchain registrations
 * @access  Private
 */
router.get(
  '/documents/:documentId/registrations',
  protect,
  blockchainVerificationController.getDocumentBlockchainRegistrationsHandler
);

/**
 * Certificate Routes
 */

/**
 * @route   POST /api/v1/blockchain/documents/:documentId/certificate
 * @desc    Generate verification certificate
 * @access  Private
 */
router.post(
  '/documents/:documentId/certificate',
  protect,
  blockchainVerificationController.generateVerificationCertificateHandler
);

/**
 * @route   GET /api/v1/blockchain/verify/:token
 * @desc    Verify document with token
 * @access  Public
 */
router.get(
  '/verify/:token',
  blockchainVerificationController.verifyDocumentWithTokenHandler
);

/**
 * Smart Contract Routes
 */

/**
 * @route   POST /api/v1/blockchain/documents/:documentId/contracts
 * @desc    Create smart contract for document
 * @access  Private
 */
router.post(
  '/documents/:documentId/contracts',
  protect,
  verifiedEmail,
  blockchainVerificationController.createSmartContractHandler
);

/**
 * @route   GET /api/v1/blockchain/documents/:documentId/contracts
 * @desc    Get document smart contracts
 * @access  Private
 */
router.get(
  '/documents/:documentId/contracts',
  protect,
  blockchainVerificationController.getDocumentSmartContractsHandler
);

/**
 * @route   POST /api/v1/blockchain/contracts/:contractId/execute
 * @desc    Execute smart contract
 * @access  Private
 */
router.post(
  '/contracts/:contractId/execute',
  protect,
  verifiedEmail,
  blockchainVerificationController.executeSmartContractHandler
);

module.exports = router;
