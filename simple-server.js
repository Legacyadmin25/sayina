/**
 * Simple Express Server for Sayina E-Signature Service
 * 
 * This is a minimal server to demonstrate the API structure
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize express app
const app = express();

// Set up middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Simple in-memory data store
const users = [];
const documents = [];
const envelopes = [];

// Routes
// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Sayina E-Signature Service is running',
    timestamp: new Date()
  });
});

// API documentation route
app.get('/api-docs', (req, res) => {
  res.status(200).send(`
    <html>
      <head>
        <title>Sayina API Documentation</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          h1 { color: #333; }
          h2 { color: #0066cc; margin-top: 30px; }
          .endpoint { background-color: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 10px; }
          .method { font-weight: bold; color: #009900; }
          .url { color: #0066cc; }
          .description { margin-top: 5px; }
        </style>
      </head>
      <body>
        <h1>Sayina E-Signature Service API Documentation</h1>
        <p>This is a simplified documentation of the Sayina E-Signature Service API.</p>
        
        <h2>Authentication</h2>
        <div class="endpoint">
          <div><span class="method">POST</span> <span class="url">/api/v1/auth/register</span></div>
          <div class="description">Register a new user</div>
        </div>
        <div class="endpoint">
          <div><span class="method">POST</span> <span class="url">/api/v1/auth/login</span></div>
          <div class="description">Login a user</div>
        </div>
        
        <h2>Documents</h2>
        <div class="endpoint">
          <div><span class="method">POST</span> <span class="url">/api/v1/documents/upload</span></div>
          <div class="description">Upload a new document</div>
        </div>
        <div class="endpoint">
          <div><span class="method">GET</span> <span class="url">/api/v1/documents</span></div>
          <div class="description">Get all user documents</div>
        </div>
        
        <h2>Envelopes</h2>
        <div class="endpoint">
          <div><span class="method">POST</span> <span class="url">/api/v1/envelopes</span></div>
          <div class="description">Create a new envelope</div>
        </div>
        <div class="endpoint">
          <div><span class="method">GET</span> <span class="url">/api/v1/envelopes</span></div>
          <div class="description">Get all user envelopes</div>
        </div>
        
        <h2>Advanced Features</h2>
        <div class="endpoint">
          <div><span class="method">POST</span> <span class="url">/api/v1/ai/analyze</span></div>
          <div class="description">Analyze a document with AI</div>
        </div>
        <div class="endpoint">
          <div><span class="method">POST</span> <span class="url">/api/v1/blockchain/register</span></div>
          <div class="description">Register a document on blockchain</div>
        </div>
      </body>
    </html>
  `);
});

// Simple home page
app.get('/', (req, res) => {
  res.status(200).send(`
    <html>
      <head>
        <title>Sayina E-Signature Service</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
          header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
          h1 { margin: 0; }
          .content { background-color: white; padding: 20px; margin-top: 20px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
          .features { display: flex; flex-wrap: wrap; margin-top: 20px; }
          .feature { flex: 1; min-width: 300px; margin: 10px; padding: 20px; background-color: #f9f9f9; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
          .feature h3 { color: #0066cc; }
          .cta { text-align: center; margin-top: 30px; }
          .button { display: inline-block; background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; }
          footer { margin-top: 50px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <header>
          <h1>Sayina E-Signature Service</h1>
          <p>South Africa's Premier Electronic Signature Solution</p>
        </header>
        
        <div class="container">
          <div class="content">
            <h2>Welcome to Sayina</h2>
            <p>Sayina is a comprehensive e-signature solution designed specifically for South African businesses, ensuring compliance with the ECT Act and POPIA while providing advanced features for document signing and management.</p>
            
            <div class="features">
              <div class="feature">
                <h3>Document Management</h3>
                <p>Upload, organize, and manage your documents securely in the cloud.</p>
              </div>
              <div class="feature">
                <h3>Electronic Signatures</h3>
                <p>Collect legally binding signatures from multiple signers with a simple workflow.</p>
              </div>
              <div class="feature">
                <h3>South African Compliance</h3>
                <p>Full compliance with the ECT Act and POPIA for legal validity of signatures.</p>
              </div>
              <div class="feature">
                <h3>AI-Powered Analysis</h3>
                <p>Automatically detect fields and analyze documents with our advanced AI.</p>
              </div>
              <div class="feature">
                <h3>Blockchain Verification</h3>
                <p>Ensure document integrity with immutable blockchain verification.</p>
              </div>
              <div class="feature">
                <h3>Enterprise Integration</h3>
                <p>Connect with your existing business systems for seamless workflows.</p>
              </div>
            </div>
            
            <div class="cta">
              <a href="/api-docs" class="button">View API Documentation</a>
            </div>
          </div>
          
          <footer>
            <p>&copy; 2025 Sayina E-Signature Service. All rights reserved.</p>
          </footer>
        </div>
      </body>
    </html>
  `);
});

// Basic API routes
// Auth routes
app.post('/api/v1/auth/register', (req, res) => {
  const { email, password, first_name, last_name } = req.body;
  
  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({
      success: false,
      message: 'Please provide all required fields'
    });
  }
  
  const userId = Date.now().toString();
  const user = {
    id: userId,
    email,
    first_name,
    last_name,
    created_at: new Date()
  };
  
  users.push(user);
  
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user,
      token: 'sample-jwt-token'
    }
  });
});

app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and password'
    });
  }
  
  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: '123456',
        email,
        first_name: 'Test',
        last_name: 'User'
      },
      token: 'sample-jwt-token'
    }
  });
});

// Document routes
app.get('/api/v1/documents', (req, res) => {
  res.status(200).json({
    success: true,
    count: documents.length,
    data: documents
  });
});

app.post('/api/v1/documents/upload', (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a document name'
    });
  }
  
  const documentId = Date.now().toString();
  const document = {
    id: documentId,
    name,
    description: description || '',
    status: 'active',
    created_at: new Date()
  };
  
  documents.push(document);
  
  res.status(201).json({
    success: true,
    message: 'Document uploaded successfully',
    data: {
      document
    }
  });
});

// Envelope routes
app.get('/api/v1/envelopes', (req, res) => {
  res.status(200).json({
    success: true,
    count: envelopes.length,
    data: envelopes
  });
});

app.post('/api/v1/envelopes', (req, res) => {
  const { name, message, document_ids, signers } = req.body;
  
  if (!name || !document_ids || !signers) {
    return res.status(400).json({
      success: false,
      message: 'Please provide all required fields'
    });
  }
  
  const envelopeId = Date.now().toString();
  const envelope = {
    id: envelopeId,
    name,
    message: message || '',
    document_ids,
    signers,
    status: 'draft',
    created_at: new Date()
  };
  
  envelopes.push(envelope);
  
  res.status(201).json({
    success: true,
    message: 'Envelope created successfully',
    data: {
      envelope
    }
  });
});

// AI Document Analysis route
app.post('/api/v1/ai/analyze', (req, res) => {
  const { document_id } = req.body;
  
  if (!document_id) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a document ID'
    });
  }
  
  res.status(200).json({
    success: true,
    message: 'Document analyzed successfully',
    data: {
      document_id,
      analysis: {
        detected_fields: [
          { type: 'signature', page: 1, x: 100, y: 500, width: 200, height: 50 },
          { type: 'date', page: 1, x: 400, y: 500, width: 100, height: 30 },
          { type: 'text', page: 1, x: 100, y: 300, width: 200, height: 30 }
        ],
        document_type: 'contract',
        confidence_score: 0.92
      }
    }
  });
});

// Blockchain Verification route
app.post('/api/v1/blockchain/register', (req, res) => {
  const { document_id } = req.body;
  
  if (!document_id) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a document ID'
    });
  }
  
  res.status(200).json({
    success: true,
    message: 'Document registered on blockchain successfully',
    data: {
      document_id,
      blockchain_record: {
        transaction_id: 'tx_' + Math.random().toString(36).substring(2, 15),
        timestamp: new Date(),
        document_hash: '0x' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Sayina simple server running on port ${PORT}`);
});
