/**
 * Blockchain Verification Controller
 * 
 * This controller handles blockchain-based document verification features for the Sayina E-Signature platform,
 * ensuring document integrity and providing immutable proof of document signatures.
 */

const { ApiError } = require('../middleware/errorMiddleware');
const {
  registerDocumentOnBlockchain,
  verifyDocumentOnBlockchain,
  generateVerificationCertificate,
  verifyDocumentWithToken,
  createSmartContract,
  executeSmartContract,
  getDocumentBlockchainRegistrations,
  getDocumentSmartContracts
} = require('../services/blockchainVerificationService');
const { logSystemEvent } = require('../services/loggerService');

/**
 * @desc    Register document on blockchain
 * @route   POST /api/v1/blockchain/documents/:documentId/register
 * @access  Private
 */
const registerDocumentOnBlockchainHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const {
      blockchain_network,
      include_metadata
    } = req.body;
    
    const userId = req.user.id;
    
    // Register document
    const registrationResult = await registerDocumentOnBlockchain(documentId, {
      blockchain_network,
      include_metadata
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'document_blockchain_registration',
      metadata: {
        document_id: documentId,
        registration_id: registrationResult.registration_id,
        blockchain_network: registrationResult.blockchain_network
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'Document registered on blockchain successfully',
      data: registrationResult
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify document on blockchain
 * @route   POST /api/v1/blockchain/documents/:documentId/verify
 * @access  Private
 */
const verifyDocumentOnBlockchainHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    
    const userId = req.user.id;
    
    // Verify document
    const verificationResult = await verifyDocumentOnBlockchain(documentId);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'document_blockchain_verification',
      metadata: {
        document_id: documentId,
        verified: verificationResult.verified
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      data: verificationResult
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate verification certificate
 * @route   POST /api/v1/blockchain/documents/:documentId/certificate
 * @access  Private
 */
const generateVerificationCertificateHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    
    const userId = req.user.id;
    
    // Generate certificate
    const certificateResult = await generateVerificationCertificate(documentId);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'verification_certificate_generated',
      metadata: {
        document_id: documentId,
        certificate_id: certificateResult.certificate_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'Verification certificate generated successfully',
      data: certificateResult
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify document with token
 * @route   GET /api/v1/blockchain/verify/:token
 * @access  Public
 */
const verifyDocumentWithTokenHandler = async (req, res, next) => {
  try {
    const { token } = req.params;
    
    // Verify document
    const verificationResult = await verifyDocumentWithToken(token);
    
    // Log event
    await logSystemEvent({
      action: 'document_token_verification',
      metadata: {
        token,
        verified: verificationResult.verified
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      data: verificationResult
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create smart contract for document
 * @route   POST /api/v1/blockchain/documents/:documentId/contracts
 * @access  Private
 */
const createSmartContractHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const {
      conditions,
      actions,
      expiration_date
    } = req.body;
    
    const userId = req.user.id;
    
    // Validate required fields
    if (!conditions || !actions) {
      return next(new ApiError(400, 'Conditions and actions are required'));
    }
    
    // Create smart contract
    const contractResult = await createSmartContract(documentId, {
      conditions,
      actions,
      expiration_date
    });
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'smart_contract_created',
      metadata: {
        document_id: documentId,
        contract_id: contractResult.contract_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'Smart contract created successfully',
      data: contractResult
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Execute smart contract
 * @route   POST /api/v1/blockchain/contracts/:contractId/execute
 * @access  Private
 */
const executeSmartContractHandler = async (req, res, next) => {
  try {
    const { contractId } = req.params;
    
    const userId = req.user.id;
    
    // Execute contract
    const executionResult = await executeSmartContract(contractId);
    
    // Log event
    await logSystemEvent({
      user_id: userId,
      action: 'smart_contract_executed',
      metadata: {
        contract_id: contractId,
        execution_id: executionResult.execution_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'Smart contract executed successfully',
      data: executionResult
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get document blockchain registrations
 * @route   GET /api/v1/blockchain/documents/:documentId/registrations
 * @access  Private
 */
const getDocumentBlockchainRegistrationsHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    
    // Get registrations
    const registrations = await getDocumentBlockchainRegistrations(documentId);
    
    res.status(200).json({
      success: true,
      count: registrations.length,
      data: registrations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get document smart contracts
 * @route   GET /api/v1/blockchain/documents/:documentId/contracts
 * @access  Private
 */
const getDocumentSmartContractsHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    
    // Get contracts
    const contracts = await getDocumentSmartContracts(documentId);
    
    res.status(200).json({
      success: true,
      count: contracts.length,
      data: contracts
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerDocumentOnBlockchainHandler,
  verifyDocumentOnBlockchainHandler,
  generateVerificationCertificateHandler,
  verifyDocumentWithTokenHandler,
  createSmartContractHandler,
  executeSmartContractHandler,
  getDocumentBlockchainRegistrationsHandler,
  getDocumentSmartContractsHandler
};
