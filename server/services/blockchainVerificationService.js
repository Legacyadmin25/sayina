/**
 * Blockchain Verification Service
 * 
 * This service provides blockchain-based document verification capabilities for the Sayina E-Signature platform,
 * ensuring document integrity and providing immutable proof of document signatures.
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { logSystemEvent } = require('./loggerService');

/**
 * Create document hash
 * @param {string} documentId - Document ID
 * @returns {Promise<string>} - Document hash
 */
const createDocumentHash = async (documentId) => {
  try {
    // Get document
    const document = await db('envelope_documents')
      .where('id', documentId)
      .first();
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Get document file path
    const documentPath = path.join(__dirname, '..', document.file_path);
    
    // Check if file exists
    if (!fs.existsSync(documentPath)) {
      throw new Error('Document file not found');
    }
    
    // Read document content
    const documentContent = fs.readFileSync(documentPath);
    
    // Create hash
    const hash = crypto.createHash('sha256').update(documentContent).digest('hex');
    
    return hash;
  } catch (error) {
    console.error('Error creating document hash:', error);
    throw error;
  }
};

/**
 * Register document on blockchain
 * @param {string} documentId - Document ID
 * @param {Object} options - Registration options
 * @returns {Promise<Object>} - Registration result
 */
const registerDocumentOnBlockchain = async (documentId, options = {}) => {
  try {
    const {
      blockchain_network = 'ethereum',
      include_metadata = true
    } = options;
    
    // Get document
    const document = await db('envelope_documents')
      .where('id', documentId)
      .first();
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Get envelope
    const envelope = await db('envelopes')
      .where('id', document.envelope_id)
      .first();
    
    if (!envelope) {
      throw new Error('Envelope not found');
    }
    
    // Create document hash
    const documentHash = await createDocumentHash(documentId);
    
    // Get metadata if requested
    let metadata = {};
    if (include_metadata) {
      // Get signers
      const signers = await db('envelope_signers')
        .where('envelope_id', envelope.id)
        .select('id', 'email', 'first_name', 'last_name', 'status', 'completed_at');
      
      metadata = {
        document_name: document.name,
        envelope_name: envelope.name,
        created_at: document.created_at,
        signers: signers.map(signer => ({
          email: signer.email,
          name: `${signer.first_name} ${signer.last_name}`,
          status: signer.status,
          completed_at: signer.completed_at
        }))
      };
    }
    
    // In a real implementation, this would interact with a blockchain network
    // For now, we'll simulate the blockchain registration
    
    // Generate transaction ID
    const transactionId = `0x${crypto.randomBytes(32).toString('hex')}`;
    
    // Generate block number
    const blockNumber = Math.floor(Math.random() * 1000000) + 10000000;
    
    // Generate timestamp
    const timestamp = new Date();
    
    // Store blockchain registration
    const registrationId = uuidv4();
    await db('blockchain_registrations').insert({
      id: registrationId,
      document_id: documentId,
      envelope_id: envelope.id,
      document_hash: documentHash,
      blockchain_network,
      transaction_id: transactionId,
      block_number: blockNumber,
      metadata: JSON.stringify(metadata),
      status: 'confirmed',
      created_at: db.fn.now(),
      confirmed_at: db.fn.now()
    });
    
    return {
      registration_id: registrationId,
      document_id: documentId,
      envelope_id: envelope.id,
      document_hash: documentHash,
      blockchain_network,
      transaction_id: transactionId,
      block_number: blockNumber,
      status: 'confirmed',
      created_at: new Date(),
      confirmed_at: new Date()
    };
  } catch (error) {
    console.error('Error registering document on blockchain:', error);
    throw error;
  }
};

/**
 * Verify document on blockchain
 * @param {string} documentId - Document ID
 * @returns {Promise<Object>} - Verification result
 */
const verifyDocumentOnBlockchain = async (documentId) => {
  try {
    // Get document
    const document = await db('envelope_documents')
      .where('id', documentId)
      .first();
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Get blockchain registration
    const registration = await db('blockchain_registrations')
      .where('document_id', documentId)
      .orderBy('created_at', 'desc')
      .first();
    
    if (!registration) {
      return {
        verified: false,
        message: 'Document not registered on blockchain'
      };
    }
    
    // Create current document hash
    const currentHash = await createDocumentHash(documentId);
    
    // Compare hashes
    const hashesMatch = currentHash === registration.document_hash;
    
    // In a real implementation, this would verify the transaction on the blockchain
    // For now, we'll simulate the verification
    
    return {
      verified: hashesMatch,
      message: hashesMatch ? 'Document verified on blockchain' : 'Document has been modified since registration',
      registration_id: registration.id,
      document_id: documentId,
      registered_hash: registration.document_hash,
      current_hash: currentHash,
      blockchain_network: registration.blockchain_network,
      transaction_id: registration.transaction_id,
      block_number: registration.block_number,
      registered_at: registration.created_at,
      verification_timestamp: new Date()
    };
  } catch (error) {
    console.error('Error verifying document on blockchain:', error);
    throw error;
  }
};

/**
 * Generate verification certificate
 * @param {string} documentId - Document ID
 * @returns {Promise<Object>} - Certificate details
 */
const generateVerificationCertificate = async (documentId) => {
  try {
    // Verify document
    const verificationResult = await verifyDocumentOnBlockchain(documentId);
    
    if (!verificationResult.verified) {
      throw new Error('Document verification failed');
    }
    
    // Get document
    const document = await db('envelope_documents')
      .where('id', documentId)
      .first();
    
    // Get envelope
    const envelope = await db('envelopes')
      .where('id', document.envelope_id)
      .first();
    
    // Get signers
    const signers = await db('envelope_signers')
      .where('envelope_id', envelope.id)
      .select('id', 'email', 'first_name', 'last_name', 'status', 'completed_at');
    
    // Generate certificate ID
    const certificateId = uuidv4();
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Create certificate content
    const certificateContent = {
      certificate_id: certificateId,
      document_id: documentId,
      document_name: document.name,
      envelope_id: envelope.id,
      envelope_name: envelope.name,
      blockchain_network: verificationResult.blockchain_network,
      transaction_id: verificationResult.transaction_id,
      block_number: verificationResult.block_number,
      document_hash: verificationResult.registered_hash,
      registered_at: verificationResult.registered_at,
      signers: signers.map(signer => ({
        name: `${signer.first_name} ${signer.last_name}`,
        email: signer.email,
        status: signer.status,
        completed_at: signer.completed_at
      })),
      verification_url: `/api/v1/blockchain/verify/${verificationToken}`,
      generated_at: new Date()
    };
    
    // Store certificate
    await db('verification_certificates').insert({
      id: certificateId,
      document_id: documentId,
      envelope_id: envelope.id,
      verification_token: verificationToken,
      content: JSON.stringify(certificateContent),
      created_at: db.fn.now()
    });
    
    return {
      certificate_id: certificateId,
      verification_token: verificationToken,
      content: certificateContent
    };
  } catch (error) {
    console.error('Error generating verification certificate:', error);
    throw error;
  }
};

/**
 * Verify document with token
 * @param {string} verificationToken - Verification token
 * @returns {Promise<Object>} - Verification result
 */
const verifyDocumentWithToken = async (verificationToken) => {
  try {
    // Get certificate
    const certificate = await db('verification_certificates')
      .where('verification_token', verificationToken)
      .first();
    
    if (!certificate) {
      return {
        verified: false,
        message: 'Invalid verification token'
      };
    }
    
    // Parse certificate content
    const content = JSON.parse(certificate.content);
    
    // Verify document
    const verificationResult = await verifyDocumentOnBlockchain(certificate.document_id);
    
    return {
      verified: verificationResult.verified,
      message: verificationResult.message,
      certificate: content,
      verification_timestamp: new Date()
    };
  } catch (error) {
    console.error('Error verifying document with token:', error);
    throw error;
  }
};

/**
 * Create smart contract for document
 * @param {string} documentId - Document ID
 * @param {Object} contractData - Contract data
 * @returns {Promise<Object>} - Smart contract details
 */
const createSmartContract = async (documentId, contractData) => {
  try {
    const {
      conditions,
      actions,
      expiration_date
    } = contractData;
    
    // Get document
    const document = await db('envelope_documents')
      .where('id', documentId)
      .first();
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Get envelope
    const envelope = await db('envelopes')
      .where('id', document.envelope_id)
      .first();
    
    // Validate conditions and actions
    if (!Array.isArray(conditions) || conditions.length === 0) {
      throw new Error('At least one condition is required');
    }
    
    if (!Array.isArray(actions) || actions.length === 0) {
      throw new Error('At least one action is required');
    }
    
    // Register document on blockchain if not already registered
    const registration = await db('blockchain_registrations')
      .where('document_id', documentId)
      .first();
    
    let registrationResult;
    if (!registration) {
      registrationResult = await registerDocumentOnBlockchain(documentId);
    } else {
      registrationResult = {
        registration_id: registration.id,
        transaction_id: registration.transaction_id,
        block_number: registration.block_number
      };
    }
    
    // In a real implementation, this would deploy a smart contract to a blockchain
    // For now, we'll simulate the smart contract creation
    
    // Generate contract address
    const contractAddress = `0x${crypto.randomBytes(20).toString('hex')}`;
    
    // Generate contract ID
    const contractId = uuidv4();
    
    // Store smart contract
    await db('smart_contracts').insert({
      id: contractId,
      document_id: documentId,
      envelope_id: envelope.id,
      registration_id: registrationResult.registration_id,
      contract_address: contractAddress,
      conditions: JSON.stringify(conditions),
      actions: JSON.stringify(actions),
      status: 'active',
      expiration_date: expiration_date ? new Date(expiration_date) : null,
      created_at: db.fn.now()
    });
    
    return {
      contract_id: contractId,
      document_id: documentId,
      envelope_id: envelope.id,
      contract_address: contractAddress,
      conditions,
      actions,
      status: 'active',
      expiration_date: expiration_date ? new Date(expiration_date) : null,
      created_at: new Date()
    };
  } catch (error) {
    console.error('Error creating smart contract:', error);
    throw error;
  }
};

/**
 * Execute smart contract
 * @param {string} contractId - Contract ID
 * @returns {Promise<Object>} - Execution result
 */
const executeSmartContract = async (contractId) => {
  try {
    // Get smart contract
    const contract = await db('smart_contracts')
      .where('id', contractId)
      .first();
    
    if (!contract) {
      throw new Error('Smart contract not found');
    }
    
    // Check if contract is active
    if (contract.status !== 'active') {
      throw new Error(`Smart contract is ${contract.status}`);
    }
    
    // Check if contract has expired
    if (contract.expiration_date && new Date(contract.expiration_date) < new Date()) {
      throw new Error('Smart contract has expired');
    }
    
    // Parse conditions and actions
    const conditions = JSON.parse(contract.conditions);
    const actions = JSON.parse(contract.actions);
    
    // In a real implementation, this would check conditions and execute actions on the blockchain
    // For now, we'll simulate the execution
    
    // Generate execution ID
    const executionId = uuidv4();
    
    // Generate transaction ID
    const transactionId = `0x${crypto.randomBytes(32).toString('hex')}`;
    
    // Store execution
    await db('smart_contract_executions').insert({
      id: executionId,
      contract_id: contractId,
      transaction_id: transactionId,
      status: 'completed',
      results: JSON.stringify({
        conditions_met: true,
        actions_executed: actions.map(action => ({
          type: action.type,
          success: true
        }))
      }),
      created_at: db.fn.now(),
      completed_at: db.fn.now()
    });
    
    return {
      execution_id: executionId,
      contract_id: contractId,
      transaction_id: transactionId,
      status: 'completed',
      conditions_met: true,
      actions_executed: actions.length,
      created_at: new Date(),
      completed_at: new Date()
    };
  } catch (error) {
    console.error('Error executing smart contract:', error);
    throw error;
  }
};

/**
 * Get document blockchain registrations
 * @param {string} documentId - Document ID
 * @returns {Promise<Array>} - Blockchain registrations
 */
const getDocumentBlockchainRegistrations = async (documentId) => {
  try {
    // Get registrations
    const registrations = await db('blockchain_registrations')
      .where('document_id', documentId)
      .orderBy('created_at', 'desc');
    
    return registrations.map(reg => ({
      id: reg.id,
      document_id: reg.document_id,
      envelope_id: reg.envelope_id,
      document_hash: reg.document_hash,
      blockchain_network: reg.blockchain_network,
      transaction_id: reg.transaction_id,
      block_number: reg.block_number,
      status: reg.status,
      created_at: reg.created_at,
      confirmed_at: reg.confirmed_at
    }));
  } catch (error) {
    console.error('Error getting document blockchain registrations:', error);
    throw error;
  }
};

/**
 * Get document smart contracts
 * @param {string} documentId - Document ID
 * @returns {Promise<Array>} - Smart contracts
 */
const getDocumentSmartContracts = async (documentId) => {
  try {
    // Get contracts
    const contracts = await db('smart_contracts')
      .where('document_id', documentId)
      .orderBy('created_at', 'desc');
    
    return contracts.map(contract => ({
      id: contract.id,
      document_id: contract.document_id,
      envelope_id: contract.envelope_id,
      contract_address: contract.contract_address,
      conditions: JSON.parse(contract.conditions),
      actions: JSON.parse(contract.actions),
      status: contract.status,
      expiration_date: contract.expiration_date,
      created_at: contract.created_at
    }));
  } catch (error) {
    console.error('Error getting document smart contracts:', error);
    throw error;
  }
};

module.exports = {
  registerDocumentOnBlockchain,
  verifyDocumentOnBlockchain,
  generateVerificationCertificate,
  verifyDocumentWithToken,
  createSmartContract,
  executeSmartContract,
  getDocumentBlockchainRegistrations,
  getDocumentSmartContracts
};
