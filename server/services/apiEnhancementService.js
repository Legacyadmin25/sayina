/**
 * API Enhancement Service
 * 
 * This service provides enhanced API capabilities for the Sayina E-Signature platform,
 * including extended endpoints, rate limiting controls, and developer tools.
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { logSystemEvent } = require('./loggerService');

/**
 * Generate API documentation
 * @param {Object} options - Documentation options
 * @returns {Promise<Object>} - API documentation
 */
const generateApiDocumentation = async (options = {}) => {
  try {
    const {
      format = 'json',
      version = 'v1',
      include_examples = true
    } = options;
    
    // Get all routes from the database or build dynamically
    // This is a simplified version - in a real implementation, this would scan routes files
    const apiEndpoints = [
      {
        path: '/api/v1/auth/login',
        method: 'POST',
        description: 'Authenticate user and get access token',
        parameters: [
          { name: 'email', type: 'string', required: true, description: 'User email address' },
          { name: 'password', type: 'string', required: true, description: 'User password' }
        ],
        responses: {
          '200': { description: 'Successful authentication', schema: { token: 'string' } },
          '401': { description: 'Invalid credentials' }
        }
      },
      {
        path: '/api/v1/envelopes',
        method: 'GET',
        description: 'Get list of envelopes',
        parameters: [
          { name: 'status', type: 'string', required: false, description: 'Filter by status' },
          { name: 'limit', type: 'integer', required: false, description: 'Number of results to return' },
          { name: 'offset', type: 'integer', required: false, description: 'Offset for pagination' }
        ],
        responses: {
          '200': { description: 'List of envelopes', schema: { envelopes: 'array' } }
        }
      },
      // Add more endpoints here
    ];
    
    // Add examples if requested
    if (include_examples) {
      apiEndpoints.forEach(endpoint => {
        endpoint.example = {
          request: generateExampleRequest(endpoint),
          response: generateExampleResponse(endpoint)
        };
      });
    }
    
    // Format documentation based on requested format
    let documentation;
    switch (format) {
      case 'openapi':
        documentation = formatOpenApiSpec(apiEndpoints, version);
        break;
      case 'postman':
        documentation = formatPostmanCollection(apiEndpoints, version);
        break;
      case 'json':
      default:
        documentation = { version, endpoints: apiEndpoints };
    }
    
    // Create docs directory if it doesn't exist
    const docsDir = path.join(__dirname, '..', 'docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    
    // Save documentation
    const fileName = `api-docs-${version}-${format}.json`;
    const filePath = path.join(docsDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(documentation, null, 2));
    
    return {
      documentation,
      file_path: filePath
    };
  } catch (error) {
    console.error('Error generating API documentation:', error);
    throw error;
  }
};

/**
 * Generate example request for an endpoint
 * @param {Object} endpoint - API endpoint
 * @returns {Object} - Example request
 */
const generateExampleRequest = (endpoint) => {
  const request = {
    method: endpoint.method,
    url: endpoint.path,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer {your_access_token}'
    }
  };
  
  if (endpoint.method !== 'GET' && endpoint.parameters) {
    const body = {};
    endpoint.parameters.forEach(param => {
      if (param.type === 'string') body[param.name] = 'example';
      if (param.type === 'integer') body[param.name] = 1;
      if (param.type === 'boolean') body[param.name] = true;
      if (param.type === 'array') body[param.name] = [];
      if (param.type === 'object') body[param.name] = {};
    });
    request.body = body;
  }
  
  return request;
};

/**
 * Generate example response for an endpoint
 * @param {Object} endpoint - API endpoint
 * @returns {Object} - Example response
 */
const generateExampleResponse = (endpoint) => {
  const successResponse = endpoint.responses['200'];
  if (!successResponse) return { status: 200 };
  
  const response = {
    status: 200,
    body: {
      success: true
    }
  };
  
  if (successResponse.schema) {
    Object.keys(successResponse.schema).forEach(key => {
      const type = successResponse.schema[key];
      if (type === 'string') response.body[key] = 'example';
      if (type === 'integer') response.body[key] = 1;
      if (type === 'boolean') response.body[key] = true;
      if (type === 'array') response.body[key] = [];
      if (type === 'object') response.body[key] = {};
    });
  }
  
  return response;
};

/**
 * Format API documentation as OpenAPI spec
 * @param {Array} endpoints - API endpoints
 * @param {string} version - API version
 * @returns {Object} - OpenAPI spec
 */
const formatOpenApiSpec = (endpoints, version) => {
  const openApiSpec = {
    openapi: '3.0.0',
    info: {
      title: 'Sayina E-Signature API',
      version,
      description: 'API for the Sayina E-Signature platform'
    },
    servers: [
      {
        url: 'https://api.sayina.co.za',
        description: 'Production server'
      },
      {
        url: 'https://staging-api.sayina.co.za',
        description: 'Staging server'
      }
    ],
    paths: {}
  };
  
  endpoints.forEach(endpoint => {
    const path = endpoint.path;
    const method = endpoint.method.toLowerCase();
    
    if (!openApiSpec.paths[path]) {
      openApiSpec.paths[path] = {};
    }
    
    openApiSpec.paths[path][method] = {
      summary: endpoint.description,
      parameters: endpoint.parameters.map(param => ({
        name: param.name,
        in: method === 'get' ? 'query' : 'body',
        required: param.required,
        schema: {
          type: param.type
        },
        description: param.description
      })),
      responses: {}
    };
    
    Object.keys(endpoint.responses).forEach(statusCode => {
      openApiSpec.paths[path][method].responses[statusCode] = {
        description: endpoint.responses[statusCode].description
      };
    });
  });
  
  return openApiSpec;
};

/**
 * Format API documentation as Postman collection
 * @param {Array} endpoints - API endpoints
 * @param {string} version - API version
 * @returns {Object} - Postman collection
 */
const formatPostmanCollection = (endpoints, version) => {
  const collection = {
    info: {
      name: `Sayina E-Signature API (${version})`,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: []
  };
  
  endpoints.forEach(endpoint => {
    const item = {
      name: endpoint.description,
      request: {
        method: endpoint.method,
        url: {
          raw: `{{baseUrl}}${endpoint.path}`,
          host: ['{{baseUrl}}'],
          path: endpoint.path.split('/').filter(p => p)
        },
        header: [
          {
            key: 'Content-Type',
            value: 'application/json'
          },
          {
            key: 'Authorization',
            value: 'Bearer {{accessToken}}'
          }
        ],
        description: endpoint.description
      }
    };
    
    if (endpoint.method !== 'GET' && endpoint.parameters) {
      const body = {};
      endpoint.parameters.forEach(param => {
        if (param.type === 'string') body[param.name] = 'example';
        if (param.type === 'integer') body[param.name] = 1;
        if (param.type === 'boolean') body[param.name] = true;
        if (param.type === 'array') body[param.name] = [];
        if (param.type === 'object') body[param.name] = {};
      });
      
      item.request.body = {
        mode: 'raw',
        raw: JSON.stringify(body, null, 2),
        options: {
          raw: {
            language: 'json'
          }
        }
      };
    }
    
    collection.item.push(item);
  });
  
  return collection;
};

/**
 * Create API client
 * @param {string} orgId - Organization ID
 * @param {string} userId - User ID
 * @param {Object} clientData - Client data
 * @returns {Promise<Object>} - API client details
 */
const createApiClient = async (orgId, userId, clientData) => {
  try {
    const {
      name,
      description,
      redirect_uris = [],
      allowed_origins = [],
      scopes = []
    } = clientData;
    
    // Generate client credentials
    const clientId = uuidv4();
    const clientSecret = crypto.randomBytes(32).toString('hex');
    
    // Create client record
    const client = {
      id: clientId,
      org_id: orgId,
      created_by: userId,
      name,
      description: description || null,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uris: JSON.stringify(redirect_uris),
      allowed_origins: JSON.stringify(allowed_origins),
      scopes: JSON.stringify(scopes),
      is_active: true,
      created_at: db.fn.now()
    };
    
    await db('api_clients').insert(client);
    
    // Return client details
    return {
      id: clientId,
      name,
      description: description || null,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uris,
      allowed_origins,
      scopes,
      is_active: true,
      created_at: new Date()
    };
  } catch (error) {
    console.error('Error creating API client:', error);
    throw error;
  }
};

/**
 * Get API client
 * @param {string} clientId - Client ID
 * @returns {Promise<Object>} - API client details
 */
const getApiClient = async (clientId) => {
  try {
    // Get client
    const client = await db('api_clients')
      .where('client_id', clientId)
      .first();
    
    if (!client) {
      throw new Error('API client not found');
    }
    
    // Format client
    return {
      id: client.id,
      org_id: client.org_id,
      name: client.name,
      description: client.description,
      client_id: client.client_id,
      redirect_uris: JSON.parse(client.redirect_uris),
      allowed_origins: JSON.parse(client.allowed_origins),
      scopes: JSON.parse(client.scopes),
      is_active: client.is_active,
      created_at: client.created_at,
      updated_at: client.updated_at
    };
  } catch (error) {
    console.error('Error getting API client:', error);
    throw error;
  }
};

/**
 * Update API client
 * @param {string} clientId - Client ID
 * @param {Object} clientData - Updated client data
 * @returns {Promise<boolean>} - Success status
 */
const updateApiClient = async (clientId, clientData) => {
  try {
    const {
      name,
      description,
      redirect_uris,
      allowed_origins,
      scopes,
      is_active
    } = clientData;
    
    // Build update object
    const updateObj = {};
    
    if (name !== undefined) updateObj.name = name;
    if (description !== undefined) updateObj.description = description;
    if (redirect_uris !== undefined) updateObj.redirect_uris = JSON.stringify(redirect_uris);
    if (allowed_origins !== undefined) updateObj.allowed_origins = JSON.stringify(allowed_origins);
    if (scopes !== undefined) updateObj.scopes = JSON.stringify(scopes);
    if (is_active !== undefined) updateObj.is_active = is_active;
    
    updateObj.updated_at = db.fn.now();
    
    // Update client
    await db('api_clients')
      .where('client_id', clientId)
      .update(updateObj);
    
    return true;
  } catch (error) {
    console.error('Error updating API client:', error);
    throw error;
  }
};

/**
 * Regenerate client secret
 * @param {string} clientId - Client ID
 * @returns {Promise<string>} - New client secret
 */
const regenerateClientSecret = async (clientId) => {
  try {
    // Generate new secret
    const clientSecret = crypto.randomBytes(32).toString('hex');
    
    // Update client
    await db('api_clients')
      .where('client_id', clientId)
      .update({
        client_secret: clientSecret,
        updated_at: db.fn.now()
      });
    
    return clientSecret;
  } catch (error) {
    console.error('Error regenerating client secret:', error);
    throw error;
  }
};

/**
 * Delete API client
 * @param {string} clientId - Client ID
 * @returns {Promise<boolean>} - Success status
 */
const deleteApiClient = async (clientId) => {
  try {
    // Delete client
    await db('api_clients')
      .where('client_id', clientId)
      .delete();
    
    return true;
  } catch (error) {
    console.error('Error deleting API client:', error);
    throw error;
  }
};

/**
 * Get organization API clients
 * @param {string} orgId - Organization ID
 * @returns {Promise<Array>} - API clients
 */
const getOrganizationApiClients = async (orgId) => {
  try {
    // Get clients
    const clients = await db('api_clients')
      .where('org_id', orgId)
      .orderBy('created_at', 'desc');
    
    // Format clients
    return clients.map(client => ({
      id: client.id,
      name: client.name,
      description: client.description,
      client_id: client.client_id,
      is_active: client.is_active,
      created_at: client.created_at,
      updated_at: client.updated_at
    }));
  } catch (error) {
    console.error('Error getting organization API clients:', error);
    throw error;
  }
};

/**
 * Create SDK code sample
 * @param {string} language - Programming language
 * @param {string} operation - API operation
 * @returns {Promise<string>} - Code sample
 */
const createSdkCodeSample = async (language, operation) => {
  try {
    // Define code samples for different languages and operations
    const codeSamples = {
      javascript: {
        authentication: `
const { SayinaClient } = require('sayina-sdk');

// Initialize client
const client = new SayinaClient({
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET'
});

// Authenticate
async function authenticate() {
  try {
    const token = await client.authenticate();
    console.log('Authentication successful:', token);
    return token;
  } catch (error) {
    console.error('Authentication failed:', error);
  }
}

authenticate();
`,
        createEnvelope: `
const { SayinaClient } = require('sayina-sdk');

// Initialize client
const client = new SayinaClient({
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET'
});

// Create envelope
async function createEnvelope() {
  try {
    // Authenticate first
    await client.authenticate();
    
    // Create envelope
    const envelope = await client.envelopes.create({
      name: 'Sample Envelope',
      description: 'Created via SDK',
      documents: [
        {
          name: 'Sample Document',
          file: '/path/to/document.pdf'
        }
      ],
      signers: [
        {
          email: 'signer@example.com',
          first_name: 'John',
          last_name: 'Doe'
        }
      ]
    });
    
    console.log('Envelope created:', envelope);
    return envelope;
  } catch (error) {
    console.error('Failed to create envelope:', error);
  }
}

createEnvelope();
`,
        sendEnvelope: `
const { SayinaClient } = require('sayina-sdk');

// Initialize client
const client = new SayinaClient({
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET'
});

// Send envelope
async function sendEnvelope(envelopeId) {
  try {
    // Authenticate first
    await client.authenticate();
    
    // Send envelope
    const result = await client.envelopes.send(envelopeId);
    
    console.log('Envelope sent:', result);
    return result;
  } catch (error) {
    console.error('Failed to send envelope:', error);
  }
}

sendEnvelope('ENVELOPE_ID');
`
      },
      python: {
        authentication: `
from sayina_sdk import SayinaClient

# Initialize client
client = SayinaClient(
    client_id='YOUR_CLIENT_ID',
    client_secret='YOUR_CLIENT_SECRET'
)

# Authenticate
def authenticate():
    try:
        token = client.authenticate()
        print(f'Authentication successful: {token}')
        return token
    except Exception as e:
        print(f'Authentication failed: {e}')

authenticate()
`,
        createEnvelope: `
from sayina_sdk import SayinaClient

# Initialize client
client = SayinaClient(
    client_id='YOUR_CLIENT_ID',
    client_secret='YOUR_CLIENT_SECRET'
)

# Create envelope
def create_envelope():
    try:
        # Authenticate first
        client.authenticate()
        
        # Create envelope
        envelope = client.envelopes.create(
            name='Sample Envelope',
            description='Created via SDK',
            documents=[
                {
                    'name': 'Sample Document',
                    'file': '/path/to/document.pdf'
                }
            ],
            signers=[
                {
                    'email': 'signer@example.com',
                    'first_name': 'John',
                    'last_name': 'Doe'
                }
            ]
        )
        
        print(f'Envelope created: {envelope}')
        return envelope
    except Exception as e:
        print(f'Failed to create envelope: {e}')

create_envelope()
`,
        sendEnvelope: `
from sayina_sdk import SayinaClient

# Initialize client
client = SayinaClient(
    client_id='YOUR_CLIENT_ID',
    client_secret='YOUR_CLIENT_SECRET'
)

# Send envelope
def send_envelope(envelope_id):
    try:
        # Authenticate first
        client.authenticate()
        
        # Send envelope
        result = client.envelopes.send(envelope_id)
        
        print(f'Envelope sent: {result}')
        return result
    except Exception as e:
        print(f'Failed to send envelope: {e}')

send_envelope('ENVELOPE_ID')
`
      },
      php: {
        authentication: `
<?php

require_once 'vendor/autoload.php';

use Sayina\\SayinaClient;

// Initialize client
$client = new SayinaClient([
    'client_id' => 'YOUR_CLIENT_ID',
    'client_secret' => 'YOUR_CLIENT_SECRET'
]);

// Authenticate
function authenticate() {
    global $client;
    
    try {
        $token = $client->authenticate();
        echo "Authentication successful: " . json_encode($token) . "\\n";
        return $token;
    } catch (Exception $e) {
        echo "Authentication failed: " . $e->getMessage() . "\\n";
    }
}

authenticate();
`,
        createEnvelope: `
<?php

require_once 'vendor/autoload.php';

use Sayina\\SayinaClient;

// Initialize client
$client = new SayinaClient([
    'client_id' => 'YOUR_CLIENT_ID',
    'client_secret' => 'YOUR_CLIENT_SECRET'
]);

// Create envelope
function createEnvelope() {
    global $client;
    
    try {
        // Authenticate first
        $client->authenticate();
        
        // Create envelope
        $envelope = $client->envelopes->create([
            'name' => 'Sample Envelope',
            'description' => 'Created via SDK',
            'documents' => [
                [
                    'name' => 'Sample Document',
                    'file' => '/path/to/document.pdf'
                ]
            ],
            'signers' => [
                [
                    'email' => 'signer@example.com',
                    'first_name' => 'John',
                    'last_name' => 'Doe'
                ]
            ]
        ]);
        
        echo "Envelope created: " . json_encode($envelope) . "\\n";
        return $envelope;
    } catch (Exception $e) {
        echo "Failed to create envelope: " . $e->getMessage() . "\\n";
    }
}

createEnvelope();
`,
        sendEnvelope: `
<?php

require_once 'vendor/autoload.php';

use Sayina\\SayinaClient;

// Initialize client
$client = new SayinaClient([
    'client_id' => 'YOUR_CLIENT_ID',
    'client_secret' => 'YOUR_CLIENT_SECRET'
]);

// Send envelope
function sendEnvelope($envelopeId) {
    global $client;
    
    try {
        // Authenticate first
        $client->authenticate();
        
        // Send envelope
        $result = $client->envelopes->send($envelopeId);
        
        echo "Envelope sent: " . json_encode($result) . "\\n";
        return $result;
    } catch (Exception $e) {
        echo "Failed to send envelope: " . $e->getMessage() . "\\n";
    }
}

sendEnvelope('ENVELOPE_ID');
`
      }
    };
    
    // Get code sample
    const sample = codeSamples[language]?.[operation];
    
    if (!sample) {
      throw new Error(`Code sample not found for language "${language}" and operation "${operation}"`);
    }
    
    return sample;
  } catch (error) {
    console.error('Error creating SDK code sample:', error);
    throw error;
  }
};

/**
 * Create API key
 * @param {string} orgId - Organization ID
 * @param {string} userId - User ID
 * @param {Object} keyData - API key data
 * @returns {Promise<Object>} - API key details
 */
const createApiKey = async (orgId, userId, keyData) => {
  try {
    const {
      name,
      description,
      permissions = [],
      expiration_days = 0 // 0 means no expiration
    } = keyData;
    
    // Generate API key
    const apiKey = `sayina_${crypto.randomBytes(32).toString('hex')}`;
    
    // Calculate expiration date
    let expiresAt = null;
    if (expiration_days > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiration_days);
    }
    
    // Create key record
    const keyId = uuidv4();
    await db('api_keys').insert({
      id: keyId,
      org_id: orgId,
      created_by: userId,
      name,
      description: description || null,
      api_key: apiKey,
      permissions: JSON.stringify(permissions),
      expires_at: expiresAt,
      created_at: db.fn.now()
    });
    
    // Return key details
    return {
      id: keyId,
      name,
      description: description || null,
      api_key: apiKey,
      permissions,
      expires_at: expiresAt,
      created_at: new Date()
    };
  } catch (error) {
    console.error('Error creating API key:', error);
    throw error;
  }
};

/**
 * Get API usage statistics
 * @param {string} orgId - Organization ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - API usage statistics
 */
const getApiUsageStatistics = async (orgId, options = {}) => {
  try {
    const {
      start_date,
      end_date,
      client_id,
      endpoint
    } = options;
    
    // Build date filter
    let dateFilter = {};
    if (start_date) {
      dateFilter.timestamp = dateFilter.timestamp || {};
      dateFilter.timestamp['>='] = new Date(start_date);
    }
    if (end_date) {
      dateFilter.timestamp = dateFilter.timestamp || {};
      dateFilter.timestamp['<='] = new Date(end_date);
    }
    
    // Build query
    let query = db('api_requests')
      .where('org_id', orgId)
      .where(dateFilter);
    
    // Apply filters
    if (client_id) {
      query = query.where('client_id', client_id);
    }
    
    if (endpoint) {
      query = query.where('endpoint', endpoint);
    }
    
    // Get total requests
    const totalRequests = await query.clone().count('id as count').first();
    
    // Get requests by status
    const requestsByStatus = await query.clone()
      .select('status_code')
      .count('id as count')
      .groupBy('status_code');
    
    // Get requests by endpoint
    const requestsByEndpoint = await query.clone()
      .select('endpoint')
      .count('id as count')
      .groupBy('endpoint')
      .orderBy('count', 'desc')
      .limit(10);
    
    // Get requests by client
    const requestsByClient = await query.clone()
      .select('client_id')
      .count('id as count')
      .groupBy('client_id')
      .orderBy('count', 'desc')
      .limit(10);
    
    // Get average response time
    const avgResponseTime = await query.clone()
      .avg('response_time as avg_time')
      .first();
    
    // Get requests over time
    const requestsOverTime = await db.raw(`
      SELECT 
        DATE_TRUNC('day', timestamp) as day,
        COUNT(id) as count
      FROM api_requests
      WHERE org_id = ?
      GROUP BY day
      ORDER BY day
    `, [orgId]);
    
    // Format response
    return {
      total_requests: parseInt(totalRequests.count) || 0,
      by_status: requestsByStatus.reduce((acc, item) => {
        acc[item.status_code] = parseInt(item.count);
        return acc;
      }, {}),
      by_endpoint: requestsByEndpoint.reduce((acc, item) => {
        acc[item.endpoint] = parseInt(item.count);
        return acc;
      }, {}),
      by_client: requestsByClient.reduce((acc, item) => {
        acc[item.client_id] = parseInt(item.count);
        return acc;
      }, {}),
      avg_response_time: parseFloat(avgResponseTime.avg_time) || 0,
      requests_over_time: requestsOverTime.rows || []
    };
  } catch (error) {
    console.error('Error getting API usage statistics:', error);
    throw error;
  }
};

module.exports = {
  generateApiDocumentation,
  createApiClient,
  getApiClient,
  updateApiClient,
  regenerateClientSecret,
  deleteApiClient,
  getOrganizationApiClients,
  createSdkCodeSample,
  createApiKey,
  getApiUsageStatistics
};
